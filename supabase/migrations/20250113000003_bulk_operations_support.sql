-- Migration: Bulk Operations Support
-- Description: Add support for bulk operations on reports including stored procedures and audit trails

-- Create audit log table for bulk operations
CREATE TABLE IF NOT EXISTS bulk_operation_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type text NOT NULL CHECK (operation_type IN ('status_update', 'worker_assignment', 'priority_update', 'delete')),
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  report_ids text[] NOT NULL,
  details jsonb NOT NULL,
  success_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  errors jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies for bulk operation history
ALTER TABLE bulk_operation_history ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins and workers can view bulk operation history
CREATE POLICY "Users can view bulk operation history" ON bulk_operation_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'worker')
    )
  );

-- Policy: Only admins and workers can insert bulk operation history
CREATE POLICY "Users can insert bulk operation history" ON bulk_operation_history
  FOR INSERT WITH CHECK (
    performed_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'worker')
    )
  );

-- Create function to get available workers for assignment
CREATE OR REPLACE FUNCTION get_available_workers()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  specialty text,
  current_workload integer,
  max_workload integer,
  performance_rating numeric,
  is_active boolean
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    COALESCE(p.specialty, 'General') as specialty,
    COALESCE(
      (SELECT COUNT(*)::integer 
       FROM reports r 
       WHERE r.assigned_worker_id = p.id 
       AND r.status IN ('acknowledged', 'in_progress')), 0
    ) as current_workload,
    COALESCE(p.max_workload, 10) as max_workload,
    COALESCE(p.performance_rating, 3.0) as performance_rating,
    COALESCE(p.is_active, true) as is_active
  FROM profiles p
  WHERE p.role = 'worker'
  AND COALESCE(p.is_active, true) = true
  ORDER BY 
    (COALESCE(
      (SELECT COUNT(*)::integer 
       FROM reports r 
       WHERE r.assigned_worker_id = p.id 
       AND r.status IN ('acknowledged', 'in_progress')), 0
    )::float / COALESCE(p.max_workload, 10)::float),
    p.performance_rating DESC;
END;
$$;

-- Create function for bulk status update
CREATE OR REPLACE FUNCTION bulk_update_status(
  report_ids uuid[],
  new_status text,
  update_notes text DEFAULT '',
  performed_by_user uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  success boolean,
  processed_count integer,
  failed_count integer,
  errors jsonb
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  report_id uuid;
  success_count integer := 0;
  failure_count integer := 0;
  error_details jsonb := '[]'::jsonb;
  temp_error jsonb;
BEGIN
  -- Validate user permissions
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = performed_by_user 
    AND role IN ('admin', 'worker')
  ) THEN
    RETURN QUERY SELECT false, 0, array_length(report_ids, 1), 
      jsonb_build_array(jsonb_build_object(
        'reportId', 'all',
        'error', 'Insufficient permissions'
      ));
    RETURN;
  END IF;

  -- Process each report
  FOREACH report_id IN ARRAY report_ids
  LOOP
    BEGIN
      -- Check if report exists and user has permission to update it
      IF NOT EXISTS (
        SELECT 1 FROM reports r
        WHERE r.id = report_id
        AND (
          -- Admin can update any report
          EXISTS (SELECT 1 FROM profiles WHERE id = performed_by_user AND role = 'admin')
          OR
          -- Worker can update assigned reports or unassigned reports
          (r.assigned_worker_id = performed_by_user OR r.assigned_worker_id IS NULL)
        )
      ) THEN
        temp_error := jsonb_build_object(
          'reportId', report_id,
          'error', 'Report not found or insufficient permissions'
        );
        error_details := error_details || temp_error;
        failure_count := failure_count + 1;
        CONTINUE;
      END IF;

      -- Update the report status
      UPDATE reports 
      SET 
        status = new_status::report_status,
        updated_at = NOW(),
        notes = CASE 
          WHEN update_notes != '' THEN 
            COALESCE(notes, '') || 
            CASE WHEN COALESCE(notes, '') != '' THEN E'\n\n' ELSE '' END ||
            '--- Bulk Update (' || NOW()::text || ') ---' || E'\n' || update_notes
          ELSE notes
        END
      WHERE id = report_id;

      -- Create notification for citizen
      INSERT INTO notifications (
        recipient_id,
        type,
        title,
        message,
        related_report_id,
        created_at
      )
      SELECT 
        r.citizen_id,
        'status_update',
        'Report Status Updated',
        'Your report "' || r.title || '" has been updated to ' || new_status || 
        CASE WHEN update_notes != '' THEN '. Note: ' || update_notes ELSE '.' END,
        r.id,
        NOW()
      FROM reports r
      WHERE r.id = report_id;

      success_count := success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      temp_error := jsonb_build_object(
        'reportId', report_id,
        'error', SQLERRM
      );
      error_details := error_details || temp_error;
      failure_count := failure_count + 1;
    END;
  END LOOP;

  -- Log the bulk operation
  INSERT INTO bulk_operation_history (
    operation_type,
    performed_by,
    report_ids,
    details,
    success_count,
    failure_count,
    errors
  ) VALUES (
    'status_update',
    performed_by_user,
    ARRAY(SELECT unnest(report_ids)::text),
    jsonb_build_object(
      'new_status', new_status,
      'notes', update_notes
    ),
    success_count,
    failure_count,
    error_details
  );

  RETURN QUERY SELECT 
    (success_count > 0), 
    success_count, 
    failure_count, 
    error_details;
END;
$$;

-- Create function for bulk worker assignment
CREATE OR REPLACE FUNCTION bulk_assign_worker(
  report_ids uuid[],
  worker_id uuid,
  performed_by_user uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  success boolean,
  processed_count integer,
  failed_count integer,
  errors jsonb
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  report_id uuid;
  success_count integer := 0;
  failure_count integer := 0;
  error_details jsonb := '[]'::jsonb;
  temp_error jsonb;
  worker_name text;
BEGIN
  -- Validate user permissions (only admins can assign workers)
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = performed_by_user 
    AND role = 'admin'
  ) THEN
    RETURN QUERY SELECT false, 0, array_length(report_ids, 1), 
      jsonb_build_array(jsonb_build_object(
        'reportId', 'all',
        'error', 'Only administrators can assign workers'
      ));
    RETURN;
  END IF;

  -- Get worker name for notifications
  SELECT full_name INTO worker_name
  FROM profiles 
  WHERE id = worker_id AND role = 'worker';

  IF worker_name IS NULL THEN
    RETURN QUERY SELECT false, 0, array_length(report_ids, 1), 
      jsonb_build_array(jsonb_build_object(
        'reportId', 'all',
        'error', 'Invalid worker ID'
      ));
    RETURN;
  END IF;

  -- Process each report
  FOREACH report_id IN ARRAY report_ids
  LOOP
    BEGIN
      -- Check if report exists
      IF NOT EXISTS (SELECT 1 FROM reports WHERE id = report_id) THEN
        temp_error := jsonb_build_object(
          'reportId', report_id,
          'error', 'Report not found'
        );
        error_details := error_details || temp_error;
        failure_count := failure_count + 1;
        CONTINUE;
      END IF;

      -- Update the report assignment
      UPDATE reports 
      SET 
        assigned_worker_id = worker_id,
        status = CASE 
          WHEN status = 'pending' THEN 'acknowledged'::report_status 
          ELSE status 
        END,
        updated_at = NOW()
      WHERE id = report_id;

      -- Create notification for citizen
      INSERT INTO notifications (
        recipient_id,
        type,
        title,
        message,
        related_report_id,
        created_at
      )
      SELECT 
        r.citizen_id,
        'assignment',
        'Report Assigned',
        'Your report "' || r.title || '" has been assigned to ' || worker_name || ' for resolution.',
        r.id,
        NOW()
      FROM reports r
      WHERE r.id = report_id;

      -- Create notification for worker
      INSERT INTO notifications (
        recipient_id,
        type,
        title,
        message,
        related_report_id,
        created_at
      ) VALUES (
        worker_id,
        'assignment',
        'New Report Assignment',
        'You have been assigned a new report. Please review and take appropriate action.',
        report_id,
        NOW()
      );

      success_count := success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      temp_error := jsonb_build_object(
        'reportId', report_id,
        'error', SQLERRM
      );
      error_details := error_details || temp_error;
      failure_count := failure_count + 1;
    END;
  END LOOP;

  -- Log the bulk operation
  INSERT INTO bulk_operation_history (
    operation_type,
    performed_by,
    report_ids,
    details,
    success_count,
    failure_count,
    errors
  ) VALUES (
    'worker_assignment',
    performed_by_user,
    ARRAY(SELECT unnest(report_ids)::text),
    jsonb_build_object(
      'worker_id', worker_id,
      'worker_name', worker_name
    ),
    success_count,
    failure_count,
    error_details
  );

  RETURN QUERY SELECT 
    (success_count > 0), 
    success_count, 
    failure_count, 
    error_details;
END;
$$;

-- Create function for bulk priority update
CREATE OR REPLACE FUNCTION bulk_update_priority(
  report_ids uuid[],
  new_priority text,
  performed_by_user uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  success boolean,
  processed_count integer,
  failed_count integer,
  errors jsonb
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  report_id uuid;
  success_count integer := 0;
  failure_count integer := 0;
  error_details jsonb := '[]'::jsonb;
  temp_error jsonb;
BEGIN
  -- Validate user permissions
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = performed_by_user 
    AND role IN ('admin', 'worker')
  ) THEN
    RETURN QUERY SELECT false, 0, array_length(report_ids, 1), 
      jsonb_build_array(jsonb_build_object(
        'reportId', 'all',
        'error', 'Insufficient permissions'
      ));
    RETURN;
  END IF;

  -- Process each report
  FOREACH report_id IN ARRAY report_ids
  LOOP
    BEGIN
      -- Check if report exists and user has permission to update it
      IF NOT EXISTS (
        SELECT 1 FROM reports r
        WHERE r.id = report_id
        AND (
          -- Admin can update any report
          EXISTS (SELECT 1 FROM profiles WHERE id = performed_by_user AND role = 'admin')
          OR
          -- Worker can update assigned reports
          r.assigned_worker_id = performed_by_user
        )
      ) THEN
        temp_error := jsonb_build_object(
          'reportId', report_id,
          'error', 'Report not found or insufficient permissions'
        );
        error_details := error_details || temp_error;
        failure_count := failure_count + 1;
        CONTINUE;
      END IF;

      -- Update the report priority
      UPDATE reports 
      SET 
        priority = new_priority::priority_level,
        updated_at = NOW()
      WHERE id = report_id;

      success_count := success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      temp_error := jsonb_build_object(
        'reportId', report_id,
        'error', SQLERRM
      );
      error_details := error_details || temp_error;
      failure_count := failure_count + 1;
    END;
  END LOOP;

  -- Log the bulk operation
  INSERT INTO bulk_operation_history (
    operation_type,
    performed_by,
    report_ids,
    details,
    success_count,
    failure_count,
    errors
  ) VALUES (
    'priority_update',
    performed_by_user,
    ARRAY(SELECT unnest(report_ids)::text),
    jsonb_build_object(
      'new_priority', new_priority
    ),
    success_count,
    failure_count,
    error_details
  );

  RETURN QUERY SELECT 
    (success_count > 0), 
    success_count, 
    failure_count, 
    error_details;
END;
$$;

-- Create function for bulk delete
CREATE OR REPLACE FUNCTION bulk_delete_reports(
  report_ids uuid[],
  performed_by_user uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  success boolean,
  processed_count integer,
  failed_count integer,
  errors jsonb
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  report_id uuid;
  success_count integer := 0;
  failure_count integer := 0;
  error_details jsonb := '[]'::jsonb;
  temp_error jsonb;
  report_title text;
  citizen_id uuid;
BEGIN
  -- Validate user permissions (only admins can delete reports)
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = performed_by_user 
    AND role = 'admin'
  ) THEN
    RETURN QUERY SELECT false, 0, array_length(report_ids, 1), 
      jsonb_build_array(jsonb_build_object(
        'reportId', 'all',
        'error', 'Only administrators can delete reports'
      ));
    RETURN;
  END IF;

  -- Process each report
  FOREACH report_id IN ARRAY report_ids
  LOOP
    BEGIN
      -- Get report details before deletion
      SELECT title, reports.citizen_id INTO report_title, citizen_id
      FROM reports 
      WHERE id = report_id;

      IF report_title IS NULL THEN
        temp_error := jsonb_build_object(
          'reportId', report_id,
          'error', 'Report not found'
        );
        error_details := error_details || temp_error;
        failure_count := failure_count + 1;
        CONTINUE;
      END IF;

      -- Create notification for citizen before deleting
      INSERT INTO notifications (
        recipient_id,
        type,
        title,
        message,
        created_at
      ) VALUES (
        citizen_id,
        'report_deleted',
        'Report Deleted',
        'Your report "' || report_title || '" has been deleted by an administrator.',
        NOW()
      );

      -- Delete related records first
      DELETE FROM notifications WHERE related_report_id = report_id;
      DELETE FROM report_comments WHERE report_id = report_id;
      DELETE FROM report_upvotes WHERE report_id = report_id;
      
      -- Delete the report
      DELETE FROM reports WHERE id = report_id;

      success_count := success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      temp_error := jsonb_build_object(
        'reportId', report_id,
        'error', SQLERRM
      );
      error_details := error_details || temp_error;
      failure_count := failure_count + 1;
    END;
  END LOOP;

  -- Log the bulk operation
  INSERT INTO bulk_operation_history (
    operation_type,
    performed_by,
    report_ids,
    details,
    success_count,
    failure_count,
    errors
  ) VALUES (
    'delete',
    performed_by_user,
    ARRAY(SELECT unnest(report_ids)::text),
    jsonb_build_object(
      'deleted_count', success_count
    ),
    success_count,
    failure_count,
    error_details
  );

  RETURN QUERY SELECT 
    (success_count > 0), 
    success_count, 
    failure_count, 
    error_details;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_available_workers() TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_status(uuid[], text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_assign_worker(uuid[], uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_priority(uuid[], text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_delete_reports(uuid[], uuid) TO authenticated;
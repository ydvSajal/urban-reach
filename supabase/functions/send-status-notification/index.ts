import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  reportId: string;
  oldStatus: string;
  newStatus: string;
  notes?: string;
  changedBy: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { reportId, oldStatus, newStatus, notes, changedBy }: NotificationRequest = await req.json()

    // Get report details with citizen and worker information
    const { data: report, error: reportError } = await supabaseClient
      .from('reports')
      .select(`
        *,
        citizen:profiles!reports_citizen_id_fkey(full_name, email),
        worker:workers(full_name, email),
        council:councils(name, city)
      `)
      .eq('id', reportId)
      .single()

    if (reportError) {
      throw new Error(`Failed to fetch report: ${reportError.message}`)
    }

    // Get the person who made the change
    const { data: changer, error: changerError } = await supabaseClient
      .from('profiles')
      .select('full_name, role')
      .eq('user_id', changedBy)
      .single()

    if (changerError) {
      console.warn(`Could not fetch changer details: ${changerError.message}`)
    }

    const changerName = changer?.full_name || 'System'
    const changerRole = changer?.role || 'system'

    // Prepare email data
    const emailData = {
      reportNumber: report.report_number,
      reportTitle: report.title,
      reportDescription: report.description,
      location: report.location_address,
      category: report.category.replace('_', ' '),
      oldStatus: oldStatus.replace('_', ' '),
      newStatus: newStatus.replace('_', ' '),
      notes: notes || '',
      changerName,
      changerRole,
      councilName: report.council?.name || 'Municipal Council',
      councilCity: report.council?.city || '',
      createdAt: new Date(report.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      updatedAt: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // Send notification to citizen
    if (report.citizen?.email) {
      const citizenTemplate = generateCitizenEmailTemplate(emailData)
      await sendEmail(report.citizen.email, citizenTemplate)
    }

    // Send notification to assigned worker (if different from changer)
    if (report.worker?.email && report.worker.email !== report.citizen?.email) {
      // Only notify worker if they didn't make the change
      const { data: workerUser } = await supabaseClient
        .from('workers')
        .select('user_id')
        .eq('email', report.worker.email)
        .single()

      if (workerUser?.user_id !== changedBy) {
        const workerTemplate = generateWorkerEmailTemplate(emailData)
        await sendEmail(report.worker.email, workerTemplate)
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notifications sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error sending notifications:', error)
    return new Response(
      JSON.stringify({ error: (error as Error)?.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function generateCitizenEmailTemplate(data: any): EmailTemplate {
  const subject = `Report #${data.reportNumber} Status Update - ${data.newStatus}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Report Status Update</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
            .status-change { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #2563eb; }
            .report-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { background: #64748b; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .status-resolved { background: #dcfce7; color: #166534; }
            .status-in-progress { background: #fed7aa; color: #9a3412; }
            .status-acknowledged { background: #dbeafe; color: #1e40af; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-closed { background: #f1f5f9; color: #475569; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Report Status Update</h1>
            <p>Your report has been updated</p>
        </div>
        
        <div class="content">
            <div class="status-change">
                <h2>Status Changed</h2>
                <p><strong>Report #${data.reportNumber}</strong> status has been updated:</p>
                <p>
                    <span class="status-badge status-${data.oldStatus.toLowerCase().replace(' ', '-')}">${data.oldStatus}</span>
                    →
                    <span class="status-badge status-${data.newStatus.toLowerCase().replace(' ', '-')}">${data.newStatus}</span>
                </p>
                <p><small>Updated by ${data.changerName} on ${data.updatedAt}</small></p>
                ${data.notes ? `<div style="margin-top: 10px; padding: 10px; background: #f1f5f9; border-radius: 4px;"><strong>Notes:</strong> ${data.notes}</div>` : ''}
            </div>
            
            <div class="report-details">
                <h3>Report Details</h3>
                <p><strong>Title:</strong> ${data.reportTitle}</p>
                <p><strong>Category:</strong> ${data.category}</p>
                <p><strong>Location:</strong> ${data.location}</p>
                <p><strong>Submitted:</strong> ${data.createdAt}</p>
                <p><strong>Council:</strong> ${data.councilName}, ${data.councilCity}</p>
            </div>
            
            ${getStatusMessage(data.newStatus)}
        </div>
        
        <div class="footer">
            <p>This is an automated notification from ${data.councilName}</p>
            <p>Please do not reply to this email</p>
        </div>
    </body>
    </html>
  `
  
  const text = `
Report Status Update

Your report #${data.reportNumber} has been updated:
Status: ${data.oldStatus} → ${data.newStatus}
Updated by: ${data.changerName} on ${data.updatedAt}

${data.notes ? `Notes: ${data.notes}` : ''}

Report Details:
- Title: ${data.reportTitle}
- Category: ${data.category}
- Location: ${data.location}
- Submitted: ${data.createdAt}
- Council: ${data.councilName}, ${data.councilCity}

${getStatusMessageText(data.newStatus)}

This is an automated notification from ${data.councilName}.
  `
  
  return { subject, html, text }
}

function generateWorkerEmailTemplate(data: any): EmailTemplate {
  const subject = `Work Assignment Update - Report #${data.reportNumber}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Work Assignment Update</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f0fdf4; padding: 20px; border: 1px solid #bbf7d0; }
            .assignment-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #059669; }
            .report-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { background: #64748b; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Work Assignment Update</h1>
            <p>Report status has been updated</p>
        </div>
        
        <div class="content">
            <div class="assignment-info">
                <h2>Status Update</h2>
                <p><strong>Report #${data.reportNumber}</strong> assigned to you has been updated:</p>
                <p><strong>New Status:</strong> ${data.newStatus}</p>
                <p><strong>Updated by:</strong> ${data.changerName} on ${data.updatedAt}</p>
                ${data.notes ? `<div style="margin-top: 10px; padding: 10px; background: #f1f5f9; border-radius: 4px;"><strong>Notes:</strong> ${data.notes}</div>` : ''}
            </div>
            
            <div class="report-details">
                <h3>Report Details</h3>
                <p><strong>Title:</strong> ${data.reportTitle}</p>
                <p><strong>Category:</strong> ${data.category}</p>
                <p><strong>Location:</strong> ${data.location}</p>
                <p><strong>Description:</strong> ${data.reportDescription}</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated notification from ${data.councilName}</p>
            <p>Please log in to your dashboard for more details</p>
        </div>
    </body>
    </html>
  `
  
  const text = `
Work Assignment Update

Report #${data.reportNumber} assigned to you has been updated:
New Status: ${data.newStatus}
Updated by: ${data.changerName} on ${data.updatedAt}

${data.notes ? `Notes: ${data.notes}` : ''}

Report Details:
- Title: ${data.reportTitle}
- Category: ${data.category}
- Location: ${data.location}
- Description: ${data.reportDescription}

Please log in to your dashboard for more details.

This is an automated notification from ${data.councilName}.
  `
  
  return { subject, html, text }
}

function getStatusMessage(status: string): string {
  switch (status.toLowerCase()) {
    case 'acknowledged':
      return '<div style="padding: 15px; background: #dbeafe; border-radius: 6px; margin: 15px 0;"><p><strong>What happens next?</strong> Your report has been reviewed and will be assigned to a worker soon.</p></div>'
    case 'in progress':
      return '<div style="padding: 15px; background: #fed7aa; border-radius: 6px; margin: 15px 0;"><p><strong>Work in Progress:</strong> Our team is actively working on resolving your issue.</p></div>'
    case 'resolved':
      return '<div style="padding: 15px; background: #dcfce7; border-radius: 6px; margin: 15px 0;"><p><strong>Issue Resolved:</strong> Your report has been successfully resolved. Thank you for helping improve our community!</p></div>'
    case 'closed':
      return '<div style="padding: 15px; background: #f1f5f9; border-radius: 6px; margin: 15px 0;"><p><strong>Report Closed:</strong> This report has been closed and archived.</p></div>'
    default:
      return ''
  }
}

function getStatusMessageText(status: string): string {
  switch (status.toLowerCase()) {
    case 'acknowledged':
      return 'What happens next? Your report has been reviewed and will be assigned to a worker soon.'
    case 'in progress':
      return 'Work in Progress: Our team is actively working on resolving your issue.'
    case 'resolved':
      return 'Issue Resolved: Your report has been successfully resolved. Thank you for helping improve our community!'
    case 'closed':
      return 'Report Closed: This report has been closed and archived.'
    default:
      return ''
  }
}

async function sendEmail(to: string, template: EmailTemplate): Promise<void> {
  // This is a placeholder for actual email sending
  // In a real implementation, you would integrate with an email service like:
  // - SendGrid
  // - Mailgun
  // - AWS SES
  // - Resend
  
  console.log(`Sending email to: ${to}`)
  console.log(`Subject: ${template.subject}`)
  console.log(`Content: ${template.text}`)
  
  // Example with a hypothetical email service:
  /*
  const response = await fetch('https://api.emailservice.com/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('EMAIL_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Email sending failed: ${response.statusText}`)
  }
  */
}
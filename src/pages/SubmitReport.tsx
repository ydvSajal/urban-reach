import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, MapPin, FileText, Camera, AlertCircle, Mic } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import AudioRecorder from "@/components/AudioRecorder";
import { uploadFiles } from "@/lib/storage";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { AddressFormatter } from "@/lib/geocoding";
import LocationPicker, { type LocationData } from "@/components/LocationPicker";

const SubmitReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  // Remove unused selectedFiles state since we handle files directly in the upload function
  const networkStatus = useNetworkStatus();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "" as Database['public']['Enums']['report_category'] | "",
    location: "",
    landmark: "",
    priority: "medium" as Database['public']['Enums']['priority_level'],
  });
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const categories = [
    { value: "roads", label: "Road Maintenance" },
    { value: "water_supply", label: "Water Supply" },
    { value: "sanitation", label: "Sewerage & Sanitation" },
    { value: "street_lights", label: "Street Lighting" },
    { value: "waste_management", label: "Waste Management" },
    { value: "public_safety", label: "Public Safety" },
    { value: "parks", label: "Parks & Recreation" },
    { value: "drainage", label: "Drainage" },
    { value: "electricity", label: "Electricity" },
    { value: "other", label: "Other" },
  ];

  // Handle image upload
  const handleImageUpload = async (files: File[]): Promise<string[]> => {
    if (!files.length) return [];
    
    setUploadingImages(true);
    try {
      // Generate a temporary report ID for file organization
      const tempReportId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const uploadedUrls = await uploadFiles(files, tempReportId);
      
      // Filter out failed uploads (empty strings)
      const successfulUrls = uploadedUrls.filter(url => url !== '');
      
      if (successfulUrls.length !== files.length) {
        toast({
          title: "Some images failed to upload",
          description: `${successfulUrls.length} of ${files.length} images uploaded successfully.`,
          variant: "destructive",
        });
      }
      
      return successfulUrls;
    } catch (error: unknown) {
      console.error("Image upload error:", error);
      toast({
        title: "Image upload failed",
        description: (error as Error)?.message || "Failed to upload images. You can still submit the report without images.",
        variant: "destructive",
      });
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  // Handle audio recording
  const handleAudioRecorded = (blob: Blob) => {
    setAudioBlob(blob);
  };

  // Upload audio file to storage
  const uploadAudioFile = async (audioBlob: Blob, reportId: string): Promise<string | null> => {
    try {
      setUploadingAudio(true);
      
      // Convert blob to file
      const audioFile = new File([audioBlob], `audio_message_${reportId}.webm`, {
        type: 'audio/webm'
      });

      // Upload to storage
      const { data, error } = await supabase.storage
        .from('reports')
        .upload(`${reportId}/audio_message.webm`, audioFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('reports')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast({
        title: "Audio upload failed",
        description: "Failed to upload audio message. Report will be submitted without audio.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to submit a report");
      }

      // Validate basic form data - location is optional for testing
      if (!formData.category) {
        toast({
          title: "Category required",
          description: "Please select a category for your report",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check network status
      if (!networkStatus.online) {
        toast({
          title: "No internet connection",
          description: "Please check your connection and try again",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get user's council_id from profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("council_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // For testing - hardcode Bennett University council ID
      // This avoids database lookup issues during testing
      const BENNETT_UNIVERSITY_ID = "00000000-0000-0000-0000-000000000001"; // Fixed ID for testing
      const selectedCouncil = {
        id: BENNETT_UNIVERSITY_ID,
        name: "Bennett University"
      };

      // If no profile exists, create one for the user with the first council
      if (!profileData) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            user_id: authUser.id,
            email: authUser.email || "",
            full_name: authUser.user_metadata?.full_name || "",
            role: "citizen",
            council_id: selectedCouncil.id
          });

        if (createProfileError) {
          console.error("Error creating profile:", createProfileError);
        }
      }

      // Images are handled directly in the ImageUpload component
      let imageUrls: string[] = [];
      let audioUrl: string | null = null;
      
      // Handle audio upload if audio was recorded
      if (audioBlob) {
        const tempReportId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        audioUrl = await uploadAudioFile(audioBlob, tempReportId);
      }

      // Prepare location data - default to Bennett University for testing
      const locationAddress = selectedLocation 
        ? selectedLocation.address 
        : formData.location || "Bennett University, Greater Noida, Uttar Pradesh";
      
      // Default coordinates for Bennett University
      const latitude = selectedLocation?.latitude || 28.4509;
      const longitude = selectedLocation?.longitude || 77.5847;

      // Create the report
      const { data, error } = await supabase
        .from("reports")
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          location_address: locationAddress,
          latitude: latitude,
          longitude: longitude,
          priority: formData.priority,
          citizen_id: user.id,
          council_id: selectedCouncil.id, // Always use Bennett University for testing
          status: "pending",
          report_number: "", // Will be set by database trigger
          images: imageUrls, // Add uploaded image URLs
          audio_message: audioUrl, // Add uploaded audio URL
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      const locationInfo = selectedLocation 
        ? ` Location: ${selectedLocation.city}, ${selectedLocation.state}` 
        : '';
      
      toast({
        title: "Report submitted successfully!",
        description: `Your report #${data.report_number} has been submitted and is being reviewed.${
          imageUrls.length > 0 ? ` ${imageUrls.length} image${imageUrls.length === 1 ? '' : 's'} attached.` : ''
        }${audioUrl ? ' Audio message included.' : ''}${locationInfo}`,
      });

      navigate("/citizen-dashboard");
    } catch (error: unknown) {
      console.error("Error submitting report:", error);
      toast({
        title: "Error submitting report",
        description: (error as Error)?.message || "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadingImages(false);
      setUploadingAudio(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Submit New Report</h1>
        <p className="text-muted-foreground">
          Report issues in your area for municipal action
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Details
          </CardTitle>
          <CardDescription>
            Please provide detailed information about the issue you're reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Network Status Alert */}
            {!networkStatus.online && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You're currently offline. Please check your internet connection before submitting.
                </AlertDescription>
              </Alert>
            )}

            {/* Loading states */}
            {(uploadingImages || uploadingAudio) && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  {uploadingImages && uploadingAudio 
                    ? "Uploading images and audio..."
                    : uploadingImages 
                    ? "Uploading images..."
                    : "Uploading audio..."
                  } Please don't close this page.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief description of the issue"
                required
                disabled={loading || uploadingImages}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value: Database['public']['Enums']['report_category']) => setFormData({ ...formData, category: value })}
                required
                disabled={loading || uploadingImages || uploadingAudio}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select issue category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide a detailed description of the issue, including when you noticed it and how it affects you or the community"
                className="min-h-[120px]"
                required
                disabled={loading || uploadingImages || uploadingAudio}
              />
            </div>

            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Photos (Optional)
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Add photos to help us understand the issue better. You can upload up to 5 images.
              </p>
              <ImageUpload
                maxFiles={5}
                maxSizePerFile={5 * 1024 * 1024} // 5MB
                acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                onUpload={handleImageUpload}
                disabled={loading || uploadingImages || uploadingAudio}
                className="border rounded-lg p-4"
              />
            </div>

            {/* Audio Recording Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Audio Message (Optional)
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Record an audio message to provide additional context about the issue.
              </p>
              <AudioRecorder
                onAudioRecorded={handleAudioRecorded}
                disabled={loading || uploadingImages || uploadingAudio}
                maxDurationMinutes={3}
              />
            </div>

            {/* Location Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location Information *
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                  disabled={loading || uploadingImages || uploadingAudio}
                >
                  {showLocationPicker ? "Hide Map" : "Use Map"}
                </Button>
              </div>
              
              {showLocationPicker && (
                <LocationPicker
                  onLocationSelect={(location) => {
                    setSelectedLocation(location);
                    setFormData({ 
                      ...formData, 
                      location: location.address,
                      landmark: location.landmark || formData.landmark
                    });
                  }}
                  enableGPS={true}
                  enableSearch={true}
                  height="300px"
                />
              )}
              
              {selectedLocation && (
                <Alert>
                  <MapPin className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Selected Location:</strong> {selectedLocation.address}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      Coordinates: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location Address *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => {
                      setFormData({ ...formData, location: e.target.value });
                      // Clear selected location if user manually edits address
                      if (selectedLocation && e.target.value !== selectedLocation.address) {
                        setSelectedLocation(null);
                      }
                    }}
                    placeholder="Street address or area name"
                    required={!selectedLocation}
                    disabled={loading || uploadingImages || uploadingAudio}
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedLocation 
                      ? "Address auto-filled from map selection. You can edit if needed." 
                      : "Enter address manually or use the map above to select location"
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="landmark">Nearby Landmark</Label>
                  <Input
                    id="landmark"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    placeholder="Hospital, school, market, etc."
                    disabled={loading || uploadingImages || uploadingAudio}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value: Database['public']['Enums']['priority_level']) => setFormData({ ...formData, priority: value })}
              disabled={loading || uploadingImages || uploadingAudio}
            >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                  <SelectItem value="medium">Medium - Moderate impact</SelectItem>
                  <SelectItem value="high">High - Urgent attention needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button 
                type="submit" 
                disabled={loading || uploadingImages || uploadingAudio || !networkStatus.online} 
                className="flex-1"
              >
                {(loading || uploadingImages || uploadingAudio) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploadingImages ? "Uploading Images..." : uploadingAudio ? "Uploading Audio..." : loading ? "Submitting..." : "Submit Report"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/citizen-dashboard")}
                disabled={loading || uploadingImages || uploadingAudio}
              >
                Cancel
              </Button>
            </div>

            {/* Submission Tips */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>💡 <strong>Tips for better reports:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Include clear photos showing the issue</li>
                <li>Provide specific location details</li>
                <li>Describe how the issue affects you or others</li>
                <li>Mention if this is a recurring problem</li>
              </ul>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location Tips
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Be as specific as possible with the location</li>
          <li>• Include nearby landmarks to help locate the issue</li>
          <li>• You can mention the ward or zone if known</li>
        </ul>
      </div>
    </div>
  );
};

export default SubmitReport;
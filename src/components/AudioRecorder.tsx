import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Play, Pause, Trash2, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  disabled?: boolean;
  maxDurationMinutes?: number;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  onAudioRecorded, 
  disabled, 
  maxDurationMinutes = 5 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedAudio(audioBlob);
        setAudioURL(URL.createObjectURL(audioBlob));
        onAudioRecorded(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop at max duration
          if (newTime >= maxDurationMinutes * 60) {
            stopRecording();
            return maxDurationMinutes * 60;
          }
          return newTime;
        });
      }, 1000);

      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone",
      });

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record audio messages",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      toast({
        title: "Recording stopped",
        description: "You can now play back your recording or start a new one",
      });
    }
  };

  const playAudio = () => {
    if (audioRef.current && audioURL) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const deleteRecording = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setRecordedAudio(null);
    setAudioURL('');
    setRecordingTime(0);
    setIsPlaying(false);
    
    toast({
      title: "Recording deleted",
      description: "You can record a new audio message",
    });
  };

  const downloadAudio = () => {
    if (audioURL) {
      const a = document.createElement('a');
      a.href = audioURL;
      a.download = `audio_message_${new Date().toISOString().slice(0, 19)}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Audio Message</h3>
            <span className="text-sm text-muted-foreground">
              {formatTime(recordingTime)} / {maxDurationMinutes}:00
            </span>
          </div>

          {/* Recording Status */}
          {isRecording && (
            <Alert>
              <Mic className="h-4 w-4 animate-pulse text-red-500" />
              <AlertDescription>
                Recording in progress... Speak clearly into your microphone.
              </AlertDescription>
            </Alert>
          )}

          {/* Recording Controls */}
          <div className="flex items-center justify-center gap-2">
            {!isRecording ? (
              <Button
                type="button"
                onClick={startRecording}
                disabled={disabled}
                variant="outline"
                size="lg"
                className="flex items-center gap-2"
              >
                <Mic className="h-4 w-4" />
                Start Recording
              </Button>
            ) : (
              <Button
                type="button"
                onClick={stopRecording}
                disabled={disabled}
                variant="destructive"
                size="lg"
                className="flex items-center gap-2"
              >
                <MicOff className="h-4 w-4" />
                Stop Recording
              </Button>
            )}
          </div>

          {/* Playback Controls */}
          {recordedAudio && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  onClick={playAudio}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Play
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  onClick={deleteRecording}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>

                <Button
                  type="button"
                  onClick={downloadAudio}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>

              <audio
                ref={audioRef}
                src={audioURL}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            <p>Record an audio message to provide additional context for your report.</p>
            <p>Maximum duration: {maxDurationMinutes} minutes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioRecorder;
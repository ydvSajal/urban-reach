import { Loader2 } from "lucide-react";

interface PageLoadingProps {
  message?: string;
}

const PageLoading = ({ message = "Loading..." }: PageLoadingProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default PageLoading;
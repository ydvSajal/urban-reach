// Update this page (the content is just a fallback if you fail to update the page)

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-2xl px-4">
        <Building2 className="h-16 w-16 text-primary mx-auto mb-6" />
        <h1 className="mb-4 text-4xl font-bold">Municipal Council Portal</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Streamline citizen report management and municipal operations with our comprehensive administrative platform.
        </p>
        <Button asChild size="lg">
          <Link to="/auth">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;

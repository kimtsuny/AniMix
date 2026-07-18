"use client";

import { useState } from "react";
import { SectionContainer } from "../common/SectionContainer";
import { SectionHeader } from "../common/SectionHeader";
import { Button } from "@/shared/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SynopsisProps {
  synopsis: string | null;
}

export function Synopsis({ synopsis }: SynopsisProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!synopsis) return null;

  // Simple clean up for HTML tags if Anilist returns them (often happens)
  const cleanSynopsis = synopsis.replace(/<br><br>/g, '\n').replace(/<br>/g, '\n').replace(/<\/?i>/g, '*').replace(/<\/?b>/g, '**');

  return (
    <SectionContainer>
      <SectionHeader title="Synopsis" />
      <div className="relative">
        <div 
          className={`text-muted-foreground leading-relaxed whitespace-pre-wrap transition-all duration-300 ${!isExpanded ? 'line-clamp-4 md:line-clamp-6' : ''}`}
        >
          {cleanSynopsis}
        </div>
        
        {/* Read More button */}
        <div className={`flex justify-start mt-2 ${!isExpanded ? 'bg-gradient-to-t from-background pt-4 -mt-8 relative' : ''}`}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary hover:text-primary hover:bg-primary/10 px-0"
          >
            {isExpanded ? (
              <>Read Less <ChevronUp className="ml-1 h-4 w-4" /></>
            ) : (
              <>Read More <ChevronDown className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </SectionContainer>
  );
}

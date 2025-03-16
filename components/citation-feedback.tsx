'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface CitationFeedbackProps {
  bylawNumber: string;
  section: string;
  searchQuery?: string;
  citationText?: string;
  className?: string;
}

export function CitationFeedback({
  bylawNumber,
  section,
  searchQuery,
  citationText,
  className,
}: CitationFeedbackProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'correct' | 'incorrect' | 'incomplete' | 'outdated' | null>(null);
  const [comment, setComment] = useState('');

  const handleFeedback = async (type: 'correct' | 'incorrect' | 'incomplete' | 'outdated') => {
    if (type !== 'correct') {
      setFeedbackType(type);
      setShowCommentBox(true);
      return;
    }
    
    // For positive feedback, submit directly
    await submitFeedback(type);
  };

  const submitFeedback = async (type: 'correct' | 'incorrect' | 'incomplete' | 'outdated') => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/bylaws/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bylawNumber,
          section,
          feedback: type,
          comment: comment.trim() || undefined,
          searchQuery,
          citationText,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Thank you for your feedback!');
        setShowCommentBox(false);
        setComment('');
        setFeedbackType(null);
      } else {
        throw new Error(data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelFeedback = () => {
    setShowCommentBox(false);
    setComment('');
    setFeedbackType(null);
  };

  return (
    <div className={cn("mt-1", className)}>
      {!showCommentBox ? (
        <div className="flex items-center gap-1 justify-end">
          <span className="text-xs text-muted-foreground mr-1">Was this citation helpful?</span>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => handleFeedback('correct')}
              >
                <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>This citation is correct</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => handleFeedback('incorrect')}
              >
                <ThumbsDown className="h-3.5 w-3.5 text-red-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>This citation is incorrect</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => handleFeedback('incomplete')}
              >
                <MessageCircle className="h-3.5 w-3.5 text-amber-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>This citation is incomplete</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-md border bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground mb-1">
              {feedbackType === 'incorrect' && 'What is incorrect about this citation?'}
              {feedbackType === 'incomplete' && 'What information is missing from this citation?'}
              {feedbackType === 'outdated' && 'How is this citation outdated?'}
            </p>
            
            <Textarea
              placeholder="Please provide details to help us improve..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-20 text-xs"
              disabled={isSubmitting}
            />
            
            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={cancelFeedback}
                disabled={isSubmitting}
              >
                <X size={12} className="mr-1" />
                Cancel
              </Button>
              
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs"
                onClick={() => submitFeedback(feedbackType!)}
                disabled={isSubmitting}
              >
                <Send size={12} className="mr-1" />
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
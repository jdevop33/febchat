'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { SidebarToggle } from '@/components/app/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { FileTextIcon, PlusIcon } from '@/components/shared/icons';
import { useSidebar } from '@/components/ui/sidebar';
import { memo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function PureChatHeader({ chatId }: { chatId: string }) {
  const router = useRouter();
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      <div className="hidden flex-col md:flex">
        <div className="font-semibold text-primary">Oak Bay Municipality</div>
        <div className="text-xs text-muted-foreground">
          Bylaw Information Assistant
        </div>
      </div>

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 ml-auto px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      <Button
        className="order-4 hidden h-fit bg-blue-600 px-2 py-1.5 text-white hover:bg-blue-700 md:ml-auto md:flex md:h-[34px]"
        asChild
      >
        <Link
          href="https://www.oakbay.ca/municipal-services/bylaws"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="mr-2">
            <FileTextIcon size={16} />
          </span>
          View Official Bylaws
        </Link>
      </Button>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader);

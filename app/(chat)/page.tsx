import { cookies } from 'next/headers';
import Link from 'next/link';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { FileTextIcon } from '@/components/icons';

const BylawWelcome = () => (
  <div className="flex flex-col gap-8 max-w-2xl mx-auto px-4 py-8">
    <div className="flex flex-col gap-2 text-center">
      <h1 className="text-2xl md:text-3xl font-bold">Oak Bay Municipality Bylaw Assistant</h1>
      <p className="text-muted-foreground">
        Ask questions about Oak Bay bylaws and get accurate, helpful information
      </p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="border p-4 rounded-lg hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <FileTextIcon size={20} className="text-blue-500" />
          <h3 className="font-medium">Bylaw Information</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Get accurate information with proper citations to specific bylaws
        </p>
      </div>
      
      <div className="border p-4 rounded-lg hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
          </svg>
          <h3 className="font-medium">Document Creation</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate summaries, reports, and explanations of bylaws
        </p>
      </div>
      
      <div className="border p-4 rounded-lg hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3 className="font-medium">Clear Guidance</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Explains when you need to contact municipal staff for more assistance
        </p>
      </div>
      
      <div className="border p-4 rounded-lg hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h3 className="font-medium">Official Source</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Information directly sourced from official Oak Bay bylaws
        </p>
      </div>
    </div>
    
    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
      <div className="flex items-center gap-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
          <path d="M4 5h16v16H4V5z"/>
          <path d="M16 2v3"/>
          <path d="M8 2v3"/>
          <path d="M4 10h16"/>
        </svg>
        <h3 className="font-medium">Try asking about:</h3>
      </div>
      <ul className="text-sm space-y-1.5 ml-7 list-disc text-muted-foreground">
        <li>"What are the regulations for tree removal in Oak Bay?"</li>
        <li>"What permits do I need for home renovations?"</li>
        <li>"Can I keep chickens in my backyard in Oak Bay?"</li>
        <li>"What are the noise restrictions in Oak Bay?"</li>
        <li>"What are the parking regulations for RVs in residential areas?"</li>
      </ul>
    </div>
    
    <div className="flex justify-center">
      <button
        onClick={() => document.getElementById('chat-input')?.focus()}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Start Chatting
      </button>
    </div>
  </div>
);

export default async function Page() {
  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');
  
  // Set default model ID to bylaws model
  const modelId = modelIdFromCookie ? modelIdFromCookie.value : DEFAULT_CHAT_MODEL;

  return (
    <>
      <BylawWelcome />
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        selectedChatModel={modelId}
        selectedVisibilityType="private"
        isReadonly={false}
      />
      <DataStreamHandler id={id} />
    </>
  );
}

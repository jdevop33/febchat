'use client';

import { FileTextIcon } from '@/components/shared/icons';

export function BylawWelcome() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold md:text-3xl">
          Oak Bay Municipality Bylaw Assistant
        </h1>
        <p className="text-muted-foreground">
          Your AI-powered assistant for municipal bylaw information,
          interpretation, and guidance
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 transition-colors hover:bg-accent/50">
          <div className="mb-2 flex items-center gap-2">
            <FileTextIcon size={20} />
            <h3 className="font-medium">Bylaw Information</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Get accurate information with proper citations to specific bylaws
          </p>
        </div>

        <div className="rounded-lg border p-4 transition-colors hover:bg-accent/50">
          <div className="mb-2 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-500"
              aria-label="Document with notes"
            >
              <title>Document with notes</title>
              <path d="M15 21h-9a3 3 0 0 1-3-3v-1h10v2a2 2 0 0 0 4 0v-10.8a2 2 0 0 1 .586-1.414l2.828-2.828a2 2 0 0 1 1.414-.586h0a2 2 0 0 1 2 2v6.8" />
              <path d="M6 10h4" />
              <path d="M6 14h2" />
              <path d="M13.124 13.12a3 3 0 0 0 2.129-2.1274 2.9834 2.9834 0 0 0-.1-1.19 2.947 2.947 0 0 0-.55-1 3 3 0 1 0-2.123 5.09 2.9965 2.9965 0 0 0 1.9-4 3 3 0 0 0-4.218-1.1554" />
              <path d="M12 21V11" />
            </svg>
            <h3 className="font-medium">Bylaw Interpretation</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Understand complex regulations with clear explanations and context
          </p>
        </div>

        <div className="rounded-lg border p-4 transition-colors hover:bg-accent/50">
          <div className="mb-2 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-500"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h10" />
              <path d="M7 12h10" />
              <path d="M7 17h10" />
            </svg>
            <h3 className="font-medium">Document Creation</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate summaries and reports about specific bylaw topics
          </p>
        </div>

        <div className="rounded-lg border p-4 transition-colors hover:bg-accent/50">
          <div className="mb-2 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-500"
            >
              <path d="M12 9v4" />
              <path d="M11 12h2" />
              <path d="M16 4h4v4" />
              <path d="M14 10l6-6" />
              <path d="M8 20H4v-4" />
              <path d="M4 16l6-6" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <h3 className="font-medium">Compliance Guidance</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Learn how to comply with Oak Bay bylaws and regulations
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <div className="mb-2 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500"
          >
            <path d="M4 5h16v16H4V5z" />
            <path d="M16 2v3" />
            <path d="M8 2v3" />
            <path d="M4 10h16" />
          </svg>
          <h3 className="font-medium">Try asking about:</h3>
        </div>
        <ul className="ml-7 list-disc space-y-1.5 text-sm text-muted-foreground">
          <li>
            &ldquo;What are the regulations for tree removal in Oak Bay?&rdquo;
          </li>
          <li>&ldquo;What permits do I need for home renovations?&rdquo;</li>
          <li>&ldquo;Can I keep chickens in my backyard in Oak Bay?&rdquo;</li>
          <li>&ldquo;What are the noise restrictions in Oak Bay?&rdquo;</li>
          <li>
            &ldquo;What are the parking regulations for RVs in residential
            areas?&rdquo;
          </li>
        </ul>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => document.getElementById('chat-input')?.focus()}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground shadow transition-all hover:bg-primary/90 hover:shadow-md"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Start Chatting
        </button>
      </div>
    </div>
  );
}

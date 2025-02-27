import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { BylawWelcome } from '@/components/bylaw-welcome';

export default async function Page() {
  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  // Set default model ID to bylaws model
  const modelId = modelIdFromCookie
    ? modelIdFromCookie.value
    : DEFAULT_CHAT_MODEL;

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

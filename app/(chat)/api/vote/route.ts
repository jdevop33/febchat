import { auth } from '@/app/(auth)/auth';
import { getVotesByChatId, voteMessage } from '@/lib/db/queries';

export async function GET(request: Request) {
  console.log('Vote API: GET request received');
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    console.log(`Vote API: Requesting votes for chat ID: ${chatId}`);

    if (!chatId) {
      console.log('Vote API: Missing chatId parameter');
      return new Response(
        JSON.stringify({ error: 'chatId is required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = await auth();
    console.log(`Vote API: User authentication status: ${!!session?.user}`);

    if (!session || !session.user || !session.user.email) {
      console.log('Vote API: Unauthorized request');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get votes with error handling built in
    console.log(`Vote API: Fetching votes for chat ID: ${chatId}`);
    const votes = await getVotesByChatId({ id: chatId });
    console.log(`Vote API: Found ${votes.length} votes`);

    return Response.json(votes, { status: 200 });
  } catch (error) {
    console.error('Vote API: Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function PATCH(request: Request) {
  console.log('Vote API: PATCH request received');
  try {
    let requestData;
    try {
      requestData = await request.json();
      console.log('Vote API: Request data parsed');
    } catch (parseError) {
      console.error('Vote API: JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { chatId, messageId, type } = requestData;
    console.log(`Vote API: Request to ${type}vote message ${messageId} in chat ${chatId}`);

    // Validate request data
    if (!chatId || !messageId || !type) {
      console.log('Vote API: Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'chatId, messageId, and type are required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate vote type
    if (type !== 'up' && type !== 'down') {
      console.log(`Vote API: Invalid type - ${type}`);
      return new Response(
        JSON.stringify({ error: 'Type must be "up" or "down"' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const session = await auth();
    console.log(`Vote API: User authentication status: ${!!session?.user}`);

    if (!session || !session.user || !session.user.email) {
      console.log('Vote API: Unauthorized request');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process vote with error handling
    try {
      console.log(`Vote API: Submitting ${type} vote for message ${messageId}`);
      await voteMessage({
        chatId,
        messageId,
        type: type,
      });
      console.log('Vote API: Vote successful');
      
      return Response.json({ success: true, message: 'Vote recorded successfully' }, { status: 200 });
    } catch (voteError) {
      console.error('Vote API: Error recording vote:', voteError);
      return Response.json(
        { error: 'Failed to record vote', details: voteError instanceof Error ? voteError.message : 'Unknown error' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Vote API: Unexpected error:', error);
    return Response.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
}

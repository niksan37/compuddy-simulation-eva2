import { NextRequest, NextResponse } from 'next/server';

// Configuration (Env vars or hardcoded defaults for simulation)
const LANGFLOW_BASE_URL = process.env.LANGFLOW_BASE_URL || 'https://your-langflow-url.com';
const LANGFLOW_FLOW_ID = process.env.LANGFLOW_FLOW_ID || 'YOUR_FLOW_ID';

// Fallback keys from legacy Nginx config
const LANGFLOW_PLUGIN_KEY = process.env.LANGFLOW_PLUGIN_KEY?.trim() || 'YOUR_PLUGIN_KEY';
const LANGFLOW_API_KEY = process.env.LANGFLOW_API_KEY?.trim() || 'YOUR_API_KEY';

// Add this to handle self-signed certs in dev/test if needed (be careful in prod)
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, session_id } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        let url = `${LANGFLOW_BASE_URL}/api/v1/run/${LANGFLOW_FLOW_ID}?stream=true`;

        // Common headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Authentication Logic: inclusive approach
        // 1. If we have a Plugin Key, send it (Nginx uses this to validate)
        if (LANGFLOW_PLUGIN_KEY) {
            headers['X-Plugin-Key'] = LANGFLOW_PLUGIN_KEY;
        }

        // 2. If we have an API Key, send it (Nginx might strip it or pass it, or direct connection needs it)
        if (LANGFLOW_API_KEY) {
            headers['Authorization'] = `Bearer ${LANGFLOW_API_KEY}`;
            headers['x-api-key'] = LANGFLOW_API_KEY;
        }

        // Payload for Langflow
        const payload = {
            input_value: message,
            input_type: 'chat',
            output_type: 'chat',
            session_id: session_id || crypto.randomUUID(),
            tweaks: {}
        };

        console.log('--- DEBUG REQUEST ---');
        console.log('URL:', url);
        console.log('Key Config:', {
            pluginKeyPrefix: LANGFLOW_PLUGIN_KEY ? LANGFLOW_PLUGIN_KEY.substring(0, 4) + '...' : 'undefined',
            apiKeyPrefix: LANGFLOW_API_KEY ? LANGFLOW_API_KEY.substring(0, 4) + '...' : 'undefined'
        });
        console.log('Headers:', JSON.stringify({
            ...headers,
            'Authorization': headers['Authorization'] ? 'Bearer [MASKED]' : undefined,
            'x-api-key': headers['x-api-key'] ? '[MASKED]' : undefined,
            'X-Plugin-Key': headers['X-Plugin-Key'] ? '[MASKED]' : undefined
        }, null, 2));
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('---------------------');

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Langflow Error Response:', errorText);

            // Try to parse JSON error if possible
            let errorJson;
            try {
                errorJson = JSON.parse(errorText);
            } catch (e) {
                // ignore
            }

            return NextResponse.json({
                error: `Langflow Error: ${response.status}`,
                details: errorJson || errorText
            }, { status: response.status });
        }

        if (!response.body) {
            return NextResponse.json({ error: 'No response body from Langflow' }, { status: 500 });
        }

        // Create a TransformStream to process the chunks
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        let hasStreamed = false; // State to track if we already sent content
        let buffer = '';         // Buffer for handling split lines

        // Helper: try to extract message text from a parsed JSON object
        const extractMessage = (json: any): string | null => {
            // Strategy 1: Streaming Chunk
            if (json.chunk) return json.chunk;

            // Strategy 2: Event Messages (add_message or message)
            if ((json.event === 'add_message' || json.event === 'message') && json.data) {
                if (json.data.sender === 'User' || json.data.sender === 'user' || json.data.category === 'input') {
                    return null; // Skip user echoes
                }
                return json.data.text || json.data.message || null;
            }

            // Strategy 3: End event with final result
            if (json.event === 'end' && json.data?.result?.outputs) {
                return extractFromOutputs(json.data.result.outputs);
            }

            // Strategy 4: Outputs directly in root
            const outputs = json.outputs || json.data?.result?.outputs;
            if (outputs) return extractFromOutputs(outputs);

            // Strategy 5: Direct result object (non-SSE JSON response)
            if (json.result?.outputs) return extractFromOutputs(json.result.outputs);

            // Strategy 6: Direct text/message fields
            if (json.text) return json.text;
            if (json.message) return json.message;
            if (json.response) return json.response;
            if (json.answer) return json.answer;

            return null;
        };

        // Helper: extract message from outputs array
        const extractFromOutputs = (outputs: any[]): string | null => {
            if (!outputs || outputs.length === 0) return null;
            const firstOutput = outputs[0];
            if (firstOutput?.outputs) {
                const result = firstOutput.outputs[0];
                return result?.results?.message?.data?.text
                    || result?.results?.message?.text
                    || result?.artifacts?.message
                    || result?.outputs?.message?.message
                    || null;
            }
            return null;
        };

        const transformStream = new TransformStream({
            async transform(chunk, controller) {
                const text = decoder.decode(chunk, { stream: true });
                buffer += text;

                // Split by newline BUT keep the last part if it's incomplete
                const lines = buffer.split('\n');

                // If buffer doesn't end with newline, the last item is incomplete/partial line
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || trimmedLine === 'data: [DONE]') {
                        continue;
                    }

                    let jsonStr = trimmedLine;

                    // Strip SSE "data: " prefix if present
                    if (trimmedLine.startsWith('data: ')) {
                        jsonStr = trimmedLine.substring(6);
                    }

                    // Try to parse as JSON (works for both SSE and NDJSON)
                    try {
                        const json = JSON.parse(jsonStr);

                        // Skip "end" events if we already extracted content (prevents duplicates)
                        if (hasStreamed && json.event === 'end') {
                            continue;
                        }

                        const msg = extractMessage(json);
                        if (msg) {
                            controller.enqueue(encoder.encode(msg));
                            hasStreamed = true;
                        }
                    } catch (e) {
                        // Not valid JSON — skip silently (could be a partial line or non-JSON content)
                        console.warn('Skipped non-JSON line:', trimmedLine.substring(0, 100));
                    }
                }
            },
            async flush(controller) {
                // Handle any remaining content in the buffer
                if (buffer.trim()) {
                    let jsonStr = buffer.trim();
                    if (jsonStr.startsWith('data: ')) {
                        jsonStr = jsonStr.substring(6);
                    }
                    try {
                        const json = JSON.parse(jsonStr);
                        const msg = extractMessage(json);
                        if (msg) {
                            controller.enqueue(encoder.encode(msg));
                            hasStreamed = true;
                        }
                    } catch (e) {
                        console.warn('Could not parse final buffer:', buffer.substring(0, 100));
                    }
                }

                if (!hasStreamed) {
                    console.error('Stream ended with no content extracted.');
                    controller.enqueue(encoder.encode('Sorry, I could not process the response. Please try again.'));
                }
            }
        });

        const stream = response.body.pipeThrough(transformStream);

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/plain',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

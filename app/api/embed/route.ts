import { createSupabaseServerClient } from '@/lib/supabase/server';
import { chunkCodeFile } from '@/lib/chunker';
import { getEmbeddings } from '@/lib/embeddings';
import { isDemoMode } from '@/lib/env';

export async function POST(req: Request) {
  try {
    let userId = 'demo-user';
    let supabase = null;

    if (!isDemoMode) {
      supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new Response('Unauthorized', { status: 401 });
      }
      userId = user.id;
    }

    const { projectName, files } = await req.json();
    if (!projectName || !files || !Array.isArray(files)) {
      return new Response('Project Name and Files array are required', { status: 400 });
    }

    let projectId = 'demo-project-' + Date.now();

    // 1. Create project row
    if (supabase && !isDemoMode) {
      const { data: projectRow, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: projectName,
        })
        .select()
        .single();

      if (projectError) {
        console.error('Project creation failed:', projectError);
        return new Response('Project creation failed', { status: 500 });
      }
      projectId = projectRow.id;
    }

    // 2. Loop through files, chunk, embed, and store in code_chunks
    const chunkPromises = files.map(async (file: { name: string; content: string }) => {
      const chunks = chunkCodeFile(file.name, file.content);
      
      const embeddedChunks = await Promise.all(
        chunks.map(async (chunk) => {
          const embedding = await getEmbeddings(chunk.content);
          return {
            project_id: projectId,
            file_path: chunk.file_path,
            start_line: chunk.start_line,
            end_line: chunk.end_line,
            content: chunk.content,
            embedding: embedding,
          };
        })
      );

      if (supabase && !isDemoMode) {
        const { error: insertError } = await supabase
          .from('code_chunks')
          .insert(embeddedChunks);

        if (insertError) {
          console.error(`Failed to insert chunks for ${file.name}:`, insertError);
          throw insertError;
        }
      }

      return {
        file: file.name,
        chunksCount: chunks.length,
      };
    });

    const results = await Promise.all(chunkPromises);

    return new Response(JSON.stringify({
      success: true,
      projectId,
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Embed endpoint error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

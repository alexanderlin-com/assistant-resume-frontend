"use client";

import { 
  AssistantRuntimeProvider, 
  useLocalRuntime, 
  type ChatModelAdapter 
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// --- CUSTOM ADAPTER: Connects directly to Python Backend ---
const GenericRestAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    // 1. Grab the user's last message
    const lastMessage = messages[messages.length - 1];
    const userMessage = (lastMessage.content[0] && lastMessage.content[0].type === "text") 
      ? lastMessage.content[0].text 
      : "";

    // 2. Get the URL from .env.local (or default to localhost)
    // NOTE: We strip the trailing slash if it exists to be safe
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
    
    // 3. Fetch from your Cloud Run Backend
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
      signal: abortSignal, 
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let accumulatedText = "";

    // 4. Stream the chunks
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      accumulatedText += chunk;

      yield {
        content: [{ type: "text", text: accumulatedText }],
      };
    }
  },
};

export const Assistant = () => {
  // Use the local runtime with our custom adapter
  const runtime = useLocalRuntime(GenericRestAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full pr-0.5">
          <ThreadListSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink
                      href="#"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Resume Assistant
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Chat</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="flex-1 overflow-hidden">
              <Thread />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
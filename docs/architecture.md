# Pi Monorepo 系统架构图

## 1. 整体系统架构

```mermaid
flowchart TB
    subgraph User["用户层"]
        CLI["CLI 用户<br/>pi 命令行"]
        Web["Web 用户<br/>浏览器应用"]
        Slack["Slack 用户<br/>@mom 机器人"]
    end

    subgraph Applications["应用层"]
        subgraph CodingAgent["@mariozechner/pi-coding-agent"]
            PI["pi CLI<br/>交互式编码Agent"]
            PI_SDK["SDK<br/>Programmatic API"]
        end

        subgraph WebUI["@mariozechner/pi-web-ui"]
            ChatPanel["ChatPanel<br/>Web聊天界面"]
            AgentInterface["AgentInterface<br/>自定义布局"]
        end

        subgraph Mom["@mariozechner/pi-mom"]
            SlackBot["Slack Bot<br/>Socket Mode"]
        end

        subgraph Pods["@mariozechner/pi-pods"]
            PodCLI["pi pods CLI<br/>GPU集群管理"]
        end
    end

    subgraph AgentCore["@mariozechner/pi-agent-core"]
        Agent["Agent运行时<br/>状态管理/工具执行"]
        AgentLoop["agentLoop<br/>低级别API"]
    end

    subgraph AI["@mariozechner/pi-ai"]
        Stream["stream/complete<br/>统一API"]
        Context["Context<br/>上下文管理"]
        Providers["Providers Layer"]
        
        subgraph LLM_Providers["LLM 提供商"]
            OpenAI["OpenAI"]
            Anthropic["Anthropic Claude"]
            Google["Google Gemini"]
            Azure["Azure OpenAI"]
            Vertex["Vertex AI"]
            Bedrock["Amazon Bedrock"]
            Mistral["Mistral"]
            Groq["Groq"]
            Cerebras["Cerebras"]
            xAI["xAI Grok"]
            OpenRouter["OpenRouter"]
            Ollama["Ollama (兼容)"]
        end
    end

    subgraph TUI["@mariozechner/pi-tui"]
        TUI_Core["TUI Framework<br/>差分渲染/同步输出"]
        Components["内置组件<br/>Editor/Markdown/Select..."]
    end

    User --> Applications
    
    PI --> AgentCore
    PI_SDK --> AgentCore
    ChatPanel --> AgentCore
    AgentInterface --> AgentCore
    SlackBot --> AgentCore
    
    AgentCore --> AI
    AgentLoop --> AI
    
    AI --> Providers
    Providers --> LLM_Providers
    
    PI --> TUI
    Mom --> TUI
```

## 2. pi-ai 内部架构

```mermaid
flowchart LR
    subgraph Input["输入"]
        Model["getModel()<br/>模型选择"]
        Context["Context<br/>消息上下文"]
        Tools["Tool 定义<br/>TypeBox Schema"]
    end

    subgraph Stream_API["stream() API"]
        StreamSimple["streamSimple()<br/>简化推理"]
        Stream["stream()"]
        Complete["complete()"]
    end

    subgraph Providers["Provider Implementations"]
        OpenAI_Provider["openai-responses<br/>openai-completions"]
        Anthropic_Provider["anthropic-messages"]
        Google_Provider["google-generative-ai<br/>google-vertex"]
        Bedrock_Provider["bedrock-converse-stream"]
        Custom_Compat["OpenAI 兼容 API<br/>Ollama/vLLM/LM Studio"]
    end

    subgraph Events["事件流"]
        Text["text_delta/text_end"]
        Thinking["thinking_delta<br/>thinking_end"]
        ToolCall["toolcall_delta<br/>toolcall_end"]
        Usage["usage<br/>token计数"]
    end

    Input --> Stream_API
    Stream_API --> Providers
    Providers --> Events
```

## 3. pi-agent-core 事件流

```mermaid
sequenceDiagram
    participant U as User
    participant A as Agent
    participant LLM as pi-ai (LLM)
    participant T as Tools

    U->>A: prompt("message")
    A->>LLM: stream(model, context)
    
    rect rgb(240, 248, 255)
        Note over A,LLM: Turn Start
    end
    
    LLM-->>A: message_start
    LLM-->>A: message_update (text_delta)
    LLM-->>A: message_update (text_delta)
    
    alt 有Tool Call
        LLM-->>A: toolcall_end
        A->>T: tool_execution_start
        T-->>A: tool_execution_end
        A->>LLM: 继续下一轮
    else 正常结束
        LLM-->>A: message_end
    end
    
    A-->>U: turn_end
    A-->>U: agent_end
```

## 4. 依赖关系图

```mermaid
flowchart TB
    subgraph Core["核心依赖"]
        AI["pi-ai<br/>LLM统一API"]
        TUI["pi-tui<br/>终端UI库"]
    end

    subgraph Build_On_Core["构建于核心之上"]
        Agent["pi-agent-core<br/>Agent运行时"]
        WebUI["pi-web-ui<br/>Web UI组件"]
    end

    subgraph Applications["应用层"]
        Coding["pi-coding-agent<br/>交互式CLI"]
        Mom["pi-mom<br/>Slack Bot"]
        Pods["pi-pods<br/>GPU集群管理"]
    end

    AI --> Agent
    TUI --> Coding
    TUI --> Mom
    Agent --> Coding
    Agent --> WebUI
    Agent --> Mom
    AI --> WebUI
    WebUI --> Pods
```

## 5. 数据流架构

```mermaid
flowchart TB
    subgraph Session["会话管理"]
        SessionFile["Session File<br/>JSONL格式"]
        Context["Context<br/>LLM上下文"]
        Memory["Memory<br/>MEMORY.md"]
    end

    subgraph Tool_System["工具系统"]
        BuiltIn["内置工具<br/>read/write/edit/bash"]
        Skills["Skills<br/>CLI工具包"]
        Extensions["Extensions<br/>TS模块扩展"]
    end

    subgraph Processing["处理流程"]
        Transform["transformContext()"]
        Convert["convertToLlm()"]
        Execute["tool.execute()"]
        Compact["Context 压缩<br/>自动/手动"]
    end

    Session --> Transform
    Transform --> Convert
    Convert --> Execute
    Execute --> Session
    
    BuiltIn --> Tool_System
    Skills --> Tool_System
    Extensions --> Tool_System
```

## 6. pi-coding-agent 交互模式架构

```mermaid
flowchart LR
    subgraph Input["输入层"]
        Cmd["命令<br/>/model /settings"]
        Prompt["用户输入"]
        FileRef["@文件引用"]
        Image["图片粘贴"]
    end

    subgraph TUI_Components["TUI组件"]
        Editor["Editor<br/>多行编辑器"]
        Messages["Messages<br/>消息展示"]
        Header["Header<br/>快捷键/加载项"]
        Footer["Footer<br/>状态信息"]
    end

    subgraph Processing["处理"]
        Skills["Skills加载"]
        Templates["Prompt Templates"]
        Extensions["Extensions加载"]
        Context["Context文件加载"]
    end

    subgraph Session["会话系统"]
        Tree["/tree 会话树"]
        Branch["分支/ Fork"]
        Compact["上下文压缩"]
    end

    Input --> Editor
    Editor --> TUI_Components
    TUI_Components --> Processing
    Processing --> Session
```

## 7. mom Slack Bot 架构

```mermaid
flowchart TB
    subgraph Slack["Slack 平台"]
        SocketMode["Socket Mode<br/>WebSocket连接"]
        Channels["Channels/DMs"]
        Events["Events<br/>app_mention/message"]
    end

    subgraph Mom_Process["mom 进程"]
        SlackAdapter["Slack Adapter<br/>消息接收/发送"]
        
        subgraph Agent["Agent 运行时"]
            ContextSync["Context同步<br/>log.jsonl → context.jsonl"]
            ToolExec["Tool 执行<br/>bash/read/write/edit"]
            Memory["Memory 管理<br/>MEMORY.md"]
        end
        
        subgraph Tools["Tools"]
            Bash["bash<br/>命令执行"]
            FileOps["read/write/edit<br/>文件操作"]
            Attach["attach<br/>文件上传Slack"]
        end

        subgraph Sandbox["执行环境"]
            Docker["Docker Container"]
            Host["Host (不推荐)"]
        end
        
        Events["事件系统<br/>定时任务/提醒"]
    end

    Slack --> SlackAdapter
    SlackAdapter --> ContextSync
    ContextSync --> Agent
    Agent --> Tools
    Tools --> Docker
    Events -.-> Agent
```

## 8. pi-pods 部署架构

```mermaid
flowchart LR
    subgraph CLI["pi CLI"]
        PodMgmt["pods setup/start/stop"]
        ModelMgmt["模型管理"]
        Agent["pi agent<br/>交互式测试"]
    end

    subgraph Pod["GPU Pod"]
        vLLM["vLLM Engine"]
        Models["运行中的模型"]
        GPU["GPU 资源分配"]
    end

    subgraph Cloud_Providers["云提供商"]
        DataCrunch["DataCrunch<br/>NFS共享存储"]
        RunPod["RunPod<br/>Network Volumes"]
        Vast["Vast.ai"]
        EC2["AWS EC2"]
    end

    subgraph Models["预定义模型配置"]
        Qwen["Qwen2.5/Qwen3"]
        GLM["GLM-4.5"]
        GPTOSS["GPT-OSS"]
        Llama["Llama/Mistral"]
    end

    CLI --> PodMgmt
    PodMgmt --> Pod
    Pod --> Cloud_Providers
    ModelMgmt --> Models
    Models --> Pod
    Agent -.-> Pod
```

## 9. web-ui 组件架构

```mermaid
flowchart TB
    subgraph Components["UI 组件"]
        ChatPanel["ChatPanel<br/>主聊天面板"]
        ArtifactsPanel["ArtifactsPanel<br/>HTML/SVG预览"]
        AgentInterface["AgentInterface<br/>底层接口"]
    end

    subgraph Agent["Agent Core"]
        AgentCore["Agent<br/>状态/事件"]
        ToolRenderer["Tool Renderer<br/>工具渲染"]
    end

    subgraph Storage["存储层"]
        IndexedDB["IndexedDB"]
        Settings["SettingsStore"]
        Sessions["SessionsStore"]
        Keys["ProviderKeysStore"]
    end

    subgraph Tools["内置工具"]
        JS_REPL["JavaScript REPL"]
        Extract["文档提取"]
        Artifacts["Artifacts Tool"]
    end

    ChatPanel --> AgentInterface
    ArtifactsPanel --> AgentInterface
    AgentInterface --> AgentCore
    AgentCore --> ToolRenderer
    AgentCore --> Storage
    JS_REPL --> Tools
    Extract --> Tools
    Artifacts --> Tools
```

## 图例说明

| 层级 | 说明 |
|------|------|
| **用户层** | 直接与系统交互的终端用户 |
| **应用层** | 直接面向用户的应用程序 |
| **核心层** | pi-ai (LLM抽象) 和 pi-tui (UI抽象) |
| **构建层** | 基于核心库构建的框架 |

**核心依赖**:
- `pi-coding-agent` 依赖 `pi-agent-core` + `pi-tui`
- `pi-mom` 依赖 `pi-agent-core`
- `pi-web-ui` 依赖 `pi-agent-core` + `pi-ai`
- `pi-pods` 独立CLI工具

import { Index, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { useThrottleFn } from 'solidjs-use'
import { generateSignature } from '@/utils/auth'
import { SYSTEM_PROMPT, TOOL_LOOK_PROMPT } from '@/prompts/system'
import IconClear from './icons/Clear'
import MessageItem from './MessageItem'
import SystemRoleSettings from './SystemRoleSettings'
import ErrorMessageItem from './ErrorMessageItem'
import type { ChatMessage, ErrorMessage } from '@/types'

export default () => {
  let inputRef: HTMLTextAreaElement
  const [currentSystemRoleSettings, setCurrentSystemRoleSettings]
    = createSignal(SYSTEM_PROMPT)
  const [systemRoleEditing] = createSignal(false)
  const [messageList, setMessageList] = createSignal<ChatMessage[]>([])
  const [currentError, setCurrentError] = createSignal<ErrorMessage>()
  const [currentAssistantMessage, setCurrentAssistantMessage]
    = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [controller, setController] = createSignal<AbortController>(null)

  onMount(() => {
    try {
      if (localStorage.getItem('messageList'))
        setMessageList(JSON.parse(localStorage.getItem('messageList')))

      if (localStorage.getItem('systemRoleSettings')) {
        setCurrentSystemRoleSettings(
          localStorage.getItem('systemRoleSettings'),
        )
      }
    } catch (err) {
      console.error(err)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    onCleanup(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    })
  })

  const handleBeforeUnload = () => {
    localStorage.setItem('messageList', JSON.stringify(messageList()))
    // localStorage.setItem('systemRoleSettings', currentSystemRoleSettings())
  }

  const handleButtonClick = async() => {
    const inputValue = inputRef.value
    if (!inputValue) return

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (window?.umami) umami.trackEvent('chat_generate')
    inputRef.value = ''
    setMessageList([
      ...messageList(),
      {
        role: 'user',
        content: inputValue,
      },
    ])
    requestWithLatestMessage()
  }

  const smoothToBottom = useThrottleFn(
    () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    },
    300,
    false,
    true,
  )

  const requestWithLatestMessage = async() => {
    setLoading(true)
    setCurrentAssistantMessage('')
    setCurrentError(null)
    const storagePassword = localStorage.getItem('pass')
    try {
      const controller = new AbortController()
      setController(controller)
      const requestMessageList = [...messageList()].map(({ content, role }) => ({ content, role }))

      if (currentSystemRoleSettings()) {
        requestMessageList.unshift({
          role: 'system',
          content: currentSystemRoleSettings(),
        })
      }
      const timestamp = Date.now()
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          messages: requestMessageList,
          time: timestamp,
          pass: storagePassword,
          sign: await generateSignature({
            t: timestamp,
            m: JSON.stringify(requestMessageList) ?? '',
          }),
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const error = await response.json()
        console.error(error.error)
        setCurrentError(error.error)
        throw new Error('Request failed')
      }
      const data = response.body
      if (!data) throw new Error('No data')

      const reader = data.getReader()
      const decoder = new TextDecoder('utf-8')
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        if (value) {
          const char = decoder.decode(value)
          if (char === '\n' && currentAssistantMessage().endsWith('\n'))
            continue

          if (char)
            setCurrentAssistantMessage(currentAssistantMessage() + char)

          smoothToBottom()
        }
        done = readerDone
      }
    } catch (e) {
      console.error(e)
      setLoading(false)
      setController(null)
      return
    }
    await archiveCurrentMessage()
  }

  async function summarize(url: string, searchText: string): Promise<string> {
    // TODO: use OpenAI summarize the detail page for question
    const response = await fetch('/api/summarize', {
      method: 'post',
      body: JSON.stringify({
        url,
        pass: localStorage.getItem('pass'),
        question: searchText.trim(),
      }),
    })

    const { message, error } = await response.json()
    if (message)
      return message.content
    else
      return `Unfortunately, cannot summarize url ${url}:\n${error}`
  }

  async function search(message: string) {
    // TODO: use OpenAI summarize the detail page for question
    const searchResponse = await fetch('/api/search', {
      method: 'post',
      body: JSON.stringify({
        q: message,
        pass: localStorage.getItem('pass'),
      }),
    })

    const searchResult = await searchResponse.json()
    const searchBoxText = searchResult?.answerBox?.answer
    const searchSnippetsText = (searchResult?.organic ?? [])
      .slice(0, 3)
      .map((o: any, idx: number) => `${idx + 1}. \`${o.title}\` - ${o.snippet}`)
      .join('\n\n')

    const parts = []

    // TODO: live update
    if (searchBoxText !== undefined)
      parts.push(`Search Engine Answer:\n${searchBoxText}\n`)

    if (searchSnippetsText)
      parts.push(`Search Engine Snippets:\n${searchSnippetsText}`)

    return { content: parts.join('\n'), organic: searchResult?.organic }
  }

  const archiveCurrentMessage = async() => {
    const aiMessage = currentAssistantMessage()
    // ai response nothing, means no input from AI
    if (aiMessage) {
      setCurrentAssistantMessage('')
      setMessageList([
        ...messageList(),
        {
          role: 'assistant',
          content: aiMessage,
        },
      ])
      if (aiMessage.includes('SEARCH:')) {
        const searchQuery = aiMessage.substring(aiMessage.indexOf('SEARCH:')).split('\n')[0]
        const { content, organic } = await search(searchQuery)

        setMessageList([
          ...messageList(), {
            role: 'system',
            content: content ?? 'Not found anything in WWW',
            organic,
          },
        ])
        smoothToBottom()

        return requestWithLatestMessage()
      }

      if (aiMessage.startsWith('LOOK:')) {
        const searchItemIndex = parseInt(aiMessage.substring('LOOK: item'.length)) ?? 0
        const searchItem = messageList().reverse().map(m => m.organic).find(m => m !== undefined)?.[searchItemIndex]
        if (searchItem === undefined) {
          setMessageList([
            ...messageList(), {
              role: 'system',
              content: `Unfortunately the LOOK command is not correctly:\n${TOOL_LOOK_PROMPT}`,
            },
          ])
        } else {
          const userQuestion = messageList().reverse().find(m => m.role === 'user').content
          const linkContent = await summarize(searchItem.link, userQuestion)

          if (linkContent) {
            setMessageList([
              ...messageList(), {
                role: 'system',
                content: `Here is the content of that page:\n${linkContent}`,
              },
            ])
          } else {
            setMessageList([
              ...messageList(), {
                role: 'system',
                content: `Unfortunately currently that item ${searchItemIndex} is not accessible`,
              },
            ])
          }
        }
        smoothToBottom()
        return requestWithLatestMessage()
      }

      const SCRIPT_PREFIX = '```js+script'

      if (aiMessage.includes(SCRIPT_PREFIX)) {
        let script = aiMessage
          .substring(aiMessage.indexOf(SCRIPT_PREFIX)).trim()

        if (script.startsWith(SCRIPT_PREFIX)) {
          const start = script.indexOf(SCRIPT_PREFIX) + SCRIPT_PREFIX.length
          const end = script.indexOf('```', start + 1)
          script = script.substring(start, end)
        }

        const response = await fetch('/api/script', {
          method: 'post',
          body: JSON.stringify({
            script,
            pass: localStorage.getItem('pass'),
          }),
        })
        const { result, error } = await response.json()

        if (error) {
          setMessageList([
            ...messageList(), {
              role: 'system',
              content: `Execute script failed:\n\n\`${error}\``,
            },
          ])
        } else {
          setMessageList([
            ...messageList(), {
              role: 'system',
              content: `Script result is:\n\n\`\`\`\n${result}\n\`\`\``,
            },
          ])
        }
        smoothToBottom()
        return requestWithLatestMessage()
      }
    }

    setLoading(false)
    setController(null)
    inputRef.focus()
  }

  const clear = () => {
    inputRef.value = ''
    inputRef.style.height = 'auto'
    setMessageList([])
    setCurrentAssistantMessage('')
    setCurrentError(null)
  }

  const stopStreamFetch = () => {
    if (controller()) {
      controller().abort()
      archiveCurrentMessage()
    }
  }

  const retryLastFetch = () => {
    if (messageList().length > 0) {
      const lastMessage = messageList()[messageList().length - 1]
      if (lastMessage.role === 'assistant')
        setMessageList(messageList().slice(0, -1))

      requestWithLatestMessage()
    }
  }

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.isComposing || e.shiftKey) return

    if (e.key === 'Enter') handleButtonClick()
  }

  return (
    <div my-6>
      <SystemRoleSettings
        currentSystemRoleSettings={currentSystemRoleSettings}
      />
      <Index each={messageList()}>
        {(message, index) => (
          <MessageItem
            role={message().role}
            message={message().content}
            showRetry={() =>
              message().role === 'assistant'
              && index === messageList().length - 1
            }
            onRetry={retryLastFetch}
          />
        )}
      </Index>
      {currentAssistantMessage() && (
        <MessageItem role="assistant" message={currentAssistantMessage} />
      )}
      {currentError() && (
        <ErrorMessageItem data={currentError()} onRetry={retryLastFetch} />
      )}
      <Show
        when={!loading()}
        fallback={() => (
          <div class="gen-cb-wrapper">
            <span>AI is thinking...</span>
            <div class="gen-cb-stop" onClick={stopStreamFetch}>
              Stop
            </div>
          </div>
        )}
      >
        <div class="gen-text-wrapper" class:op-50={systemRoleEditing()}>
          <textarea
            ref={inputRef!}
            disabled={systemRoleEditing()}
            onKeyDown={handleKeydown}
            placeholder="Enter something..."
            autocomplete="off"
            autofocus
            onInput={() => {
              inputRef.style.height = 'auto'
              inputRef.style.height = `${inputRef.scrollHeight}px`
            }}
            rows="1"
            class="gen-textarea"
          />
          <button
            onClick={handleButtonClick}
            disabled={systemRoleEditing()}
            gen-slate-btn
          >
            Send
          </button>
          <button
            title="Clear"
            onClick={clear}
            disabled={systemRoleEditing()}
            gen-slate-btn
          >
            <IconClear />
          </button>
        </div>
      </Show>
    </div>
  )
}

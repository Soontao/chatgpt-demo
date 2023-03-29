import { Show, createSignal } from 'solid-js'
import MessageItem from './MessageItem'
import type { Accessor } from 'solid-js'

interface Props {
  currentSystemRoleSettings: Accessor<string>
}

export default (props: Props) => {
  const [isExpanded, setIsExpanded] = createSignal(false)

  return (
    <div class="my-4">
      <button
        class="display-btn"
        onClick={() => setIsExpanded(!isExpanded())}
      >
        {isExpanded() ? 'Hide' : 'Show'} System Message
      </button>
      <Show when={isExpanded()}>
        <MessageItem
          role="system"
          message={props.currentSystemRoleSettings()}
        />
      </Show>
    </div>
  )
}

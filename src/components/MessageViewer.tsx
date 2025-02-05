import { useRef, useLayoutEffect } from "react";
import MarkdownViewer from "./MarkdownViewer";
import type { User, Server, Message, UserList, MessageType } from "@/types";

interface MessageGroup {
  id: string;
  senderId: string;
  timestamp: string;
  messages: Message[];
  type: MessageType;
}

interface MessageViewerProps {
  user: User;
  server: Server;
  messages: Message[];
  users: UserList;
}

const MessageViewer: React.FC<MessageViewerProps> = ({
  user,
  server,
  messages,
  users,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "auto",
      block: "end",
    });
  }, [messages]);

  const formatMsgTimestamp = (timestamp: string): string => {
    if (!timestamp) return "";

    const now = new Date();
    const messageDate = new Date(parseInt(timestamp));
    const messageDay = new Date(
      messageDate.getFullYear(),
      messageDate.getMonth(),
      messageDate.getDate()
    );
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDay.getTime() === today.getTime()) {
      return messageDate.toLocaleTimeString("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (messageDay.getTime() === yesterday.getTime()) {
      return `昨天 ${messageDate.toLocaleTimeString("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return `${messageDate.toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })} ${messageDate.toLocaleTimeString("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
  };

  const groupMessages = (messages: Message[]): MessageGroup[] => {
    const sorted = [...messages].sort(
      (a, b) => Number(a.timestamp) - Number(b.timestamp)
    );

    const grouped = sorted.reduce<MessageGroup[]>((acc, message) => {
      const lastGroup = acc[acc.length - 1];

      const currentTime = Number(message.timestamp);
      const lastTime = lastGroup ? Number(lastGroup.timestamp) : 0;
      const timeDiff = currentTime - lastTime;
      const nearTime = lastGroup && timeDiff <= 5 * 60 * 1000;
      const sameSender = lastGroup && message.senderId === lastGroup.senderId;
      const isInfoMsg =
        lastGroup && message.type != "info" && lastGroup.type != "info";

      if (sameSender && nearTime && !isInfoMsg) {
        lastGroup.messages.push(message);
      } else {
        acc.push({
          id: message.id,
          senderId: message.senderId,
          timestamp: message.timestamp.toString(),
          messages: [message],
          type: message.type,
        });
      }
      return acc;
    }, []);
    return grouped;
  };
  const renderMessage = (group: MessageGroup): React.ReactElement => {
    return (
      <div key={group.id} className="flex items-start space-x-1 mb-1">
        {group.type === "info" ? (
          <>
            <img
              src={"/channel/NT_NOTIFY.png"}
              alt={"NT_NOTIFY"}
              className="select-none flex-shrink-0 mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="text-gray-700">
                {group.messages.map((message) => (
                  <div key={message.id} className="break-words">
                    <MarkdownViewer markdownText={message.content} />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <img
              src={`/channel/${users[group.senderId].gender}_${
                server.permissions[group.senderId]
              }.png`}
              alt={`${users[group.senderId].gender}_${
                server.permissions[group.senderId]
              }`}
              className="select-none flex-shrink-0 mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <span className="font-bold text-gray-900">
                  {users[group.senderId].name}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  {formatMsgTimestamp(group.timestamp)}
                </span>
              </div>

              <div className="text-gray-700">
                {group.messages.map((message) => (
                  <div key={message.id} className="break-words">
                    <MarkdownViewer markdownText={message.content} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const groupedMessages = groupMessages(messages);

  return (
    <>
      {groupedMessages.map((group) => renderMessage(group))}
      <div ref={messagesEndRef} />
    </>
  );
};

export default MessageViewer;

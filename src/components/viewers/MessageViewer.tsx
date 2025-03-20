/* eslint-disable @next/next/no-img-element */
import React, { useLayoutEffect, useRef } from 'react';

// CSS
import styles from '@/styles/messageViewer.module.css';
import permission from '@/styles/common/permission.module.css';

// Components
import MarkdownViewer from '@/components/viewers/MarkdownViewer';

// Types
import type { DirectMessage, Message } from '@/types';

// Providers
import { useLanguage } from '@/providers/LanguageProvider';

interface MessageTabProps {
  messageGroup: MessageGroup;
}

const MessageTab: React.FC<MessageTabProps> = React.memo(({ messageGroup }) => {
  // Hooks
  const lang = useLanguage();

  // Variables
  const {
    gender: senderGender,
    name: senderName,
    permissionLevel: messagePermission,
    contents: messageContents,
    timestamp: messageTimestamp,
  } = messageGroup;
  const timestamp = lang.getFormatTimestamp(messageTimestamp);

  return (
    <>
      <div
        className={`${styles['senderIcon']} ${permission[senderGender]} ${
          permission[`lv-${messagePermission}`]
        }`}
      />
      <div className={styles['messageBox']}>
        <div className={styles['header']}>
          <span className={styles['name']}>{senderName}</span>
          <span className={styles['timestamp']}>{timestamp}</span>
        </div>
        {messageContents.map((content, index) => (
          <div key={index} className={styles['content']}>
            <MarkdownViewer markdownText={content} />
          </div>
        ))}
      </div>
    </>
  );
});

MessageTab.displayName = 'MessageTab';

interface InfoTabProps {
  messageGroup: MessageGroup;
}

const InfoTab: React.FC<InfoTabProps> = React.memo(({ messageGroup }) => {
  // Variables
  const { contents: messageContents } = messageGroup;

  return (
    <>
      <img
        src={'/channel/NT_NOTIFY.png'}
        alt={'NT_NOTIFY'}
        className="select-none flex-shrink-0 mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="text-gray-700">
          {messageContents.map((content, index) => (
            <div key={index} className="break-words">
              <MarkdownViewer markdownText={content} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
});

InfoTab.displayName = 'InfoTab';

interface MessageGroup {
  id: string;
  type: 'general' | 'info';
  contents: string[];
  gender: string;
  name: string;
  permissionLevel: number | null;
  senderId: string;
  timestamp: number;
}

interface MessageViewerProps {
  messages: Message[] | DirectMessage[];
}

const MessageViewer: React.FC<MessageViewerProps> = React.memo(
  ({ messages }) => {
    // Variables
    const sortedMessages = [...messages].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    const messageGroups = sortedMessages.reduce<MessageGroup[]>(
      (acc, message) => {
        const lastGroup = acc[acc.length - 1];
        const timeDiff = lastGroup && message.timestamp - lastGroup.timestamp;
        const nearTime = lastGroup && timeDiff <= 5 * 60 * 1000;
        const sameSender = lastGroup && message.senderId === lastGroup.senderId;
        const isInfoMsg = message.type == 'info';

        if (sameSender && nearTime && !isInfoMsg) {
          lastGroup.contents.push(message.content);
        } else {
          acc.push({
            ...message,
            contents: [message.content],
            permissionLevel:
              'permissionLevel' in message ? message.permissionLevel : null,
            gender: message.gender,
            name: message.name,
          });
        }
        return acc;
      },
      [],
    );

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Effects
    useLayoutEffect(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'end',
      });
    }, [messageGroups]);

    return (
      <div className={styles['messageViewerWrapper']}>
        {messageGroups.map((messageGroup) => {
          return (
            <div key={messageGroup.id} className={styles['messageWrapper']}>
              {messageGroup.type === 'info' ? (
                <InfoTab messageGroup={messageGroup} />
              ) : (
                <MessageTab messageGroup={messageGroup} />
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    );
  },
);

MessageViewer.displayName = 'MessageViewer';

export default MessageViewer;

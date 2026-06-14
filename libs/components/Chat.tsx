import React, { useCallback, useEffect, useRef, useState } from 'react';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useRouter } from 'next/router';
import ScrollableFeed from 'react-scrollable-feed';
import { useReactiveVar } from '@apollo/client';
import { userVar } from '../../apollo/store';
import { Member } from '../types/member/member';

interface MessagePayload {
  event: string;
  text: string;
  memberData: Member | null;
}

const AI_MEMBER = {
  _id: 'veloura-ai',
  memberNick: 'Veloura AI',
  memberImage: '/img/icons/ai.png',
} as Partial<Member> as Member;

export default function Chat() {
  const chatContentRef = useRef<HTMLDivElement>(null);
  const [messagesList, setMessagesList] = useState<MessagePayload[]>([
    { event: 'message', text: 'Welcome to Veloura ✨ I\'m your personal jewelry assistant. Ask me anything about our collections, care tips, or sizing.', memberData: AI_MEMBER },
  ]);
  const textInput = useRef<HTMLInputElement>(null);
  const [messageInput, setMessageInput] = useState('');
  const [open, setOpen] = useState(false);
  const [openButton, setOpenButton] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [unread, setUnread] = useState(0);
  const router = useRouter();
  const user = useReactiveVar(userVar);

  useEffect(() => { setTimeout(() => setOpenButton(true), 600); }, []);
  useEffect(() => { setOpenButton(false); }, [router.pathname]);
  useEffect(() => { if (!open && messagesList.length > 1) setUnread((n) => n + 1); }, [messagesList]);
  useEffect(() => { if (open) setUnread(0); }, [open]);

  const getInputMessageHandler = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
  }, []);

  const getKeyHandler = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onClickHandler();
  };

  const sendToAI = async (history: MessagePayload[]) => {
    const toOpenAi = history.map((m) => ({
      role: m.memberData?._id === AI_MEMBER._id ? 'assistant' : 'user',
      content: m.text,
    }));

    const resp = await fetch('/api/ai/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: toOpenAi }),
    });
    if (!resp.body) throw new Error('No stream');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';

      for (const c of chunks) {
        if (!c.startsWith('data:')) continue;
        const payload = c.slice(5).trim();
        if (!payload) continue;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.error) {
            setMessagesList((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { event: 'message', text: `⚠️ ${parsed.error}`, memberData: AI_MEMBER };
              return copy;
            });
            return;
          }
          const { delta, done: finished } = parsed;
          if (delta) {
            setMessagesList((prev) => {
              const copy = [...prev];
              const last = copy.length - 1;
              copy[last] = { ...copy[last], text: (copy[last].text || '') + delta };
              return copy;
            });
          }
          if (finished) return;
        } catch { /* ignore partial */ }
      }
    }
  };

  const onClickHandler = async () => {
    const text = messageInput.trim();
    if (!text || streaming) return;

    const userMsg: MessagePayload = { event: 'message', text, memberData: user as Member };
    const aiMsg: MessagePayload = { event: 'message', text: '', memberData: AI_MEMBER };
    const next = [...messagesList, userMsg, aiMsg];
    setMessagesList(next);
    setMessageInput('');
    setStreaming(true);

    try {
      await sendToAI(next);
    } catch {
      setMessagesList((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { event: 'message', text: 'Sorry — AI response failed. Please try again.', memberData: AI_MEMBER };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="vl-chat">
      {/* FAB trigger */}
      {openButton && (
        <button
          className={`vl-chat__fab ${open ? 'vl-chat__fab--active' : ''}`}
          onClick={() => setOpen((p) => !p)}
          aria-label={open ? 'Close chat' : 'Open chat'}
        >
          {open ? (
            <CloseIcon style={{ fontSize: 22, color: '#fff' }} />
          ) : (
            <>
              <AutoAwesomeIcon style={{ fontSize: 22, color: '#d4af37' }} />
              {unread > 0 && <span className="vl-chat__badge">{unread}</span>}
            </>
          )}
        </button>
      )}

      {/* Chat panel */}
      <div className={`vl-chat__panel ${open ? 'vl-chat__panel--open' : ''}`} role="dialog" aria-label="Veloura AI Chat">
        {/* Header */}
        <div className="vl-chat__header">
          <div className="vl-chat__header-icon">
            <AutoAwesomeIcon style={{ fontSize: 18, color: '#d4af37' }} />
          </div>
          <div className="vl-chat__header-text">
            <span className="vl-chat__header-title">Veloura Assistant</span>
            <span className="vl-chat__header-sub">
              <span className="vl-chat__online-dot" /> AI · Always available
            </span>
          </div>
          <button className="vl-chat__header-close" onClick={() => setOpen(false)} aria-label="Close">
            <CloseIcon style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Messages */}
        <div className="vl-chat__body" ref={chatContentRef}>
          <ScrollableFeed>
            <div className="vl-chat__messages">
              {messagesList.map((msg, i) => {
                const isUser = msg.memberData?._id === user?._id;
                const isAI   = msg.memberData?._id === AI_MEMBER._id;
                const isStreaming = isAI && streaming && i === messagesList.length - 1;

                return (
                  <div key={i} className={`vl-chat__row ${isUser ? 'vl-chat__row--user' : 'vl-chat__row--ai'}`}>
                    {isAI && (
                      <div className="vl-chat__avatar">
                        <AutoAwesomeIcon style={{ fontSize: 14, color: '#d4af37' }} />
                      </div>
                    )}
                    <div className={`vl-chat__bubble ${isUser ? 'vl-chat__bubble--user' : 'vl-chat__bubble--ai'} ${isStreaming && !msg.text ? 'vl-chat__bubble--typing' : ''}`}>
                      {isStreaming && !msg.text ? (
                        <span className="vl-chat__dots">
                          <span /><span /><span />
                        </span>
                      ) : (
                        msg.text || '…'
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollableFeed>
        </div>

        {/* Input */}
        <div className="vl-chat__footer">
          <input
            ref={textInput}
            className="vl-chat__input"
            type="text"
            placeholder={streaming ? 'Generating…' : 'Ask about jewelry, sizing, care…'}
            value={messageInput}
            onChange={getInputMessageHandler}
            onKeyDown={getKeyHandler}
            disabled={!open || streaming}
            autoComplete="off"
          />
          <button className="vl-chat__send" onClick={onClickHandler} disabled={streaming || !messageInput.trim()} aria-label="Send">
            <SendIcon style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { showNotification, playNotificationSound } from '../notificationUtils';
import { queueMessage, getMessageQueue } from '../offlineUtils';
import { hapticLight, hapticSuccess, hapticNewMessage, hapticMessageSent, hapticError } from '../hapticUtils';
import { markMessageDelivered, markMessageRead, handleTypingIndicator, listenToTypingStatus } from '../messageStatusUtils';
import { messagesLogger } from '../logger';
import { setFirestoreConnected } from '../offlineUtils';

/**
 * Custom hook for messaging between couch and navigators
 * Handles message listeners, sending messages, typing indicators, and read receipts
 *
 * @param {Object} effectiveNDR - The effective NDR (active or historical)
 * @param {string} selectedCar - Selected car number
 * @param {string} viewMode - Current view mode ('navigator' or 'couch')
 * @param {Object} userProfile - User profile object
 * @param {boolean} isOnline - Online status
 * @param {boolean} isHistoricalView - Whether in historical view mode
 * @returns {Object} Messaging state and functions
 */
export const useMessaging = (effectiveNDR, selectedCar, viewMode, userProfile, isOnline, isHistoricalView) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [debugStatus, setDebugStatus] = useState('');
  const [queuedMessagesCount, setQueuedMessagesCount] = useState(0);

  const lastMessageCountRef = useRef(0);
  const lastNotifiedMessageIdRef = useRef(null);
  const isMountedRef = useRef(true);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Message listener
  useEffect(() => {
    if (!effectiveNDR || !selectedCar) {
      messagesLogger.log('Message listener not active');
      return;
    }

    const carNum = parseInt(selectedCar, 10);
    messagesLogger.log(`📨 Setting up message listener for car ${carNum}`);

    const messagesQuery = query(
      collection(db, 'couchMessages'),
      where('ndrId', '==', effectiveNDR.id),
      where('carNumber', '==', carNum),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const msgs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            sender: data.sender,
            senderName: data.senderName || (data.sender === 'couch' ? 'Couch' : `Car ${carNum}`),
            message: data.message,
            timestamp: data.timestamp?.toDate(),
            status: data.status,
            deliveredAt: data.deliveredAt,
            readAt: data.readAt
          };
        });

        messagesLogger.log(`📬 Received ${msgs.length} messages for car ${carNum}`);
        setMessages(msgs);

        // Improved duplicate notification prevention
        if (msgs.length > 0) {
          const latestMessage = msgs[msgs.length - 1];
          const isNewMessage = latestMessage.id !== lastNotifiedMessageIdRef.current;
          const isMessageForMe = (viewMode === 'navigator' && latestMessage.sender === 'couch') ||
                                  (viewMode === 'couch' && latestMessage.sender === 'navigator');

          if (isNewMessage && isMessageForMe && lastMessageCountRef.current > 0) {
            try {
              messagesLogger.log(`📲 New message detected: ${latestMessage.id}`);
              showNotification('New Message', latestMessage.message);
              playNotificationSound();
              hapticNewMessage();

              lastNotifiedMessageIdRef.current = latestMessage.id;

              // Mark message as delivered
              if (latestMessage.id && isMountedRef.current) {
                markMessageDelivered(latestMessage.id).catch(err => {
                  messagesLogger.error('Failed to mark message as delivered:', err);
                });
              }
            } catch (error) {
              messagesLogger.error('Error processing new message notification:', error);
            }
          } else if (!isNewMessage) {
            messagesLogger.debug(`⏭️ Skipping notification - message ${latestMessage.id} already notified`);
          }
        }

        // Mark received messages as read
        if (snapshot.docChanges().length > 0) {
          const newOrModifiedMsgs = snapshot.docChanges()
            .filter(change => change.type === 'added')
            .map(change => change.doc.id);

          msgs.forEach(msg => {
            try {
              const isReceivedMessage = (viewMode === 'navigator' && msg.sender === 'couch') ||
                                         (viewMode === 'couch' && msg.sender === 'navigator');
              if (isReceivedMessage && !msg.readAt && msg.id && newOrModifiedMsgs.includes(msg.id)) {
                if (isMountedRef.current) {
                  markMessageRead(msg.id).catch(err => {
                    messagesLogger.error('Failed to mark message as read:', err);
                  });
                }
              }
            } catch (error) {
              messagesLogger.error('Error marking message as read:', error);
            }
          });
        }
      },
      (error) => {
        console.error('❌ Error listening to messages:', error);
      }
    );

    return () => unsubscribe();
  }, [effectiveNDR, selectedCar, viewMode]);

  // Typing indicator listener
  useEffect(() => {
    if (!effectiveNDR || !effectiveNDR.id || !selectedCar) {
      setIsOtherTyping(false);
      return;
    }

    const carNum = parseInt(selectedCar, 10);
    if (isNaN(carNum)) {
      console.warn('⚠️ Invalid car number for typing listener');
      setIsOtherTyping(false);
      return;
    }

    console.log(`⌨️ Setting up typing listener for car ${carNum}`);

    try {
      const unsubscribe = listenToTypingStatus(effectiveNDR.id, carNum, viewMode, (isTyping) => {
        setIsOtherTyping(isTyping);
      });

      return () => {
        try {
          if (unsubscribe && typeof unsubscribe === 'function') {
            unsubscribe();
          }
        } catch (error) {
          console.error('Error unsubscribing from typing status:', error);
        }
        setIsOtherTyping(false);
      };
    } catch (error) {
      console.error('Error setting up typing listener:', error);
      setIsOtherTyping(false);
      return () => {};
    }
  }, [effectiveNDR, selectedCar, viewMode]);

  // Send message function
  const sendMessage = async (customMessage = null) => {
    // Prevent sending messages in historical view mode
    if (isHistoricalView) {
      console.log('Message send blocked - historical view mode');
      return;
    }

    const messageToSend = customMessage || newMessage;

    if (!messageToSend.trim() || !selectedCar || !effectiveNDR) {
      console.log('Message send blocked');
      return;
    }

    setSendingMessage(true);
    hapticLight();

    const carNum = parseInt(selectedCar, 10);

    const messageData = {
      ndrId: effectiveNDR.id,
      carNumber: carNum,
      sender: viewMode,
      senderName: userProfile?.name || (viewMode === 'couch' ? 'Couch' : 'Navigator'),
      message: messageToSend.trim(),
      timestamp: Timestamp.now()
    };

    console.log('✉️ Sending:', messageData);

    // Check if online
    if (!isOnline) {
      console.log('📦 Offline - queuing message');
      queueMessage(messageData);
      setQueuedMessagesCount(getMessageQueue().length);
      setDebugStatus('📦 Queued (offline)');
      // Only clear newMessage if we're not sending a custom message
      if (!customMessage) {
        setNewMessage('');
      }
      hapticSuccess();
      setTimeout(() => setDebugStatus(''), 2000);
      setSendingMessage(false);
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'couchMessages'), messageData);
      console.log('✅ SUCCESS! Doc ID:', docRef.id);

      setFirestoreConnected(true);

      setDebugStatus('✅ Sent!');
      // Only clear newMessage if we're not sending a custom message
      if (!customMessage) {
        setNewMessage('');
      }
      hapticMessageSent();

      // Clear typing indicator
      try {
        if (effectiveNDR && effectiveNDR.id && selectedCar) {
          handleTypingIndicator(effectiveNDR.id, carNum, viewMode, false);
        }
      } catch (error) {
        console.error('Error clearing typing indicator after send:', error);
      }

      setTimeout(() => setDebugStatus(''), 2000);
    } catch (error) {
      console.error('❌ SEND ERROR:', error);

      setFirestoreConnected(false);

      let errorMsg = 'Failed: ';
      if (error.code === 'permission-denied') {
        errorMsg += 'Permission denied';
      } else if (error.code === 'unavailable') {
        errorMsg += 'Network unavailable';
        queueMessage(messageData);
        setQueuedMessagesCount(getMessageQueue().length);
        errorMsg = '📦 Queued (network unavailable)';
        // Only clear newMessage if we're not sending a custom message
        if (!customMessage) {
          setNewMessage('');
        }
        hapticSuccess();
      } else {
        errorMsg += error.message;
        hapticError();
      }

      setDebugStatus(`❌ ${errorMsg}`);
      setTimeout(() => setDebugStatus(''), 5000);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle typing indicator
  const handleTyping = (isTyping) => {
    if (isHistoricalView) return;

    try {
      if (effectiveNDR && effectiveNDR.id && selectedCar) {
        handleTypingIndicator(
          effectiveNDR.id,
          parseInt(selectedCar, 10),
          viewMode,
          isTyping
        );
      }
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  };

  return {
    messages,
    newMessage,
    setNewMessage,
    sendingMessage,
    isOtherTyping,
    debugStatus,
    queuedMessagesCount,
    sendMessage,
    handleTyping,
    lastMessageCountRef,
    setDebugStatus
  };
};

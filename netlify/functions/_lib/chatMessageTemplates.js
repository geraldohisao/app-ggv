/**
 * Google Chat Message Templates for OKR Notifications
 * 
 * Templates use Google Chat Cards V2 format:
 * https://developers.google.com/workspace/chat/format-messages#card-formatting
 */

const { getAppDomain } = require('./googleChatClient');

/**
 * Format a date for display in Brazilian Portuguese
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Get priority emoji and color
 */
function getPriorityIndicator(priority) {
  const indicators = {
    'urgente': { emoji: '🔴', label: 'Urgente' },
    'alta': { emoji: '🟠', label: 'Alta' },
    'media': { emoji: '🟡', label: 'Média' },
    'baixa': { emoji: '🟢', label: 'Baixa' }
  };
  return indicators[priority] || indicators['media'];
}

/**
 * Get item type emoji
 */
function getItemTypeEmoji(itemType) {
  const emojis = {
    'iniciativa': '🎯',
    'atividade': '📝',
    'impedimento': '🚧',
    'decisão': '⚖️',
    'marco': '🏁'
  };
  return emojis[itemType] || '📋';
}

/**
 * Build deep link URL
 */
function buildDeepLink(path) {
  const domain = getAppDomain();
  return `https://${domain}${path}`;
}

// ============================================
// TEMPLATE: New Task Assigned
// ============================================

function buildTaskAssignedCard(notification) {
  const payload = notification.payload;
  const deepLink = buildDeepLink(payload.deep_link || '/okr/atividades');
  const priority = getPriorityIndicator(payload.priority);
  const itemEmoji = payload.item_type ? getItemTypeEmoji(payload.item_type) : '📋';
  
  const widgets = [
    {
      decoratedText: {
        startIcon: { knownIcon: 'DESCRIPTION' },
        topLabel: 'Tarefa',
        text: `<b>${payload.title || 'Nova tarefa'}</b>`
      }
    }
  ];
  
  // Add sprint context if available
  if (payload.sprint_title) {
    widgets.push({
      decoratedText: {
        startIcon: { knownIcon: 'FLIGHT_ARRIVAL' },
        topLabel: 'Sprint',
        text: payload.sprint_title
      }
    });
  }
  
  // Add due date if available
  if (payload.due_date) {
    widgets.push({
      decoratedText: {
        startIcon: { knownIcon: 'CLOCK' },
        topLabel: 'Prazo',
        text: formatDate(payload.due_date)
      }
    });
  }
  
  // Add priority
  widgets.push({
    decoratedText: {
      startIcon: { knownIcon: 'BOOKMARK' },
      topLabel: 'Prioridade',
      text: `${priority.emoji} ${priority.label}`
    }
  });
  
  // Add description if available (truncated)
  if (payload.description) {
    const truncatedDesc = payload.description.length > 150 
      ? payload.description.substring(0, 147) + '...'
      : payload.description;
    widgets.push({
      textParagraph: {
        text: `<i>${truncatedDesc}</i>`
      }
    });
  }
  
  return {
    cardId: `task-assigned-${notification.id}`,
    card: {
      header: {
        title: `${itemEmoji} Nova Tarefa Atribuída`,
        subtitle: `Olá, ${payload.recipient_name || 'Usuário'}!`,
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/task_alt/default/48px.svg',
        imageType: 'CIRCLE'
      },
      sections: [
        {
          header: 'Detalhes',
          collapsible: false,
          widgets
        },
        {
          widgets: [
            {
              buttonList: {
                buttons: [
                  {
                    text: 'Ver Tarefa',
                    onClick: {
                      openLink: { url: deepLink }
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  };
}

// ============================================
// TEMPLATE: Sprint Reminder (48h before end)
// ============================================

function buildSprintReminderCard(notification) {
  const payload = notification.payload;
  const deepLink = buildDeepLink(payload.deep_link || `/okr/sprints/${notification.entity_id}`);
  
  return {
    cardId: `sprint-reminder-${notification.id}`,
    card: {
      header: {
        title: '⏰ Sprint Termina em 48h',
        subtitle: `Olá, ${payload.recipient_name || 'Usuário'}!`,
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/sprint/default/48px.svg',
        imageType: 'CIRCLE'
      },
      sections: [
        {
          header: 'Detalhes da Sprint',
          collapsible: false,
          widgets: [
            {
              decoratedText: {
                startIcon: { knownIcon: 'FLIGHT_ARRIVAL' },
                topLabel: 'Sprint',
                text: `<b>${payload.sprint_title || 'Sprint'}</b>`
              }
            },
            {
              decoratedText: {
                startIcon: { knownIcon: 'CLOCK' },
                topLabel: 'Termina em',
                text: formatDate(payload.end_date)
              }
            },
            {
              decoratedText: {
                startIcon: { knownIcon: 'HOTEL_CLASS' },
                topLabel: 'Departamento',
                text: payload.department || 'Geral'
              }
            }
          ]
        },
        {
          widgets: [
            {
              textParagraph: {
                text: '📝 <b>Lembre-se:</b> Atualize o status das iniciativas e faça o check-in antes do fim da sprint!'
              }
            }
          ]
        },
        {
          widgets: [
            {
              buttonList: {
                buttons: [
                  {
                    text: 'Abrir Sprint',
                    onClick: {
                      openLink: { url: deepLink }
                    }
                  },
                  {
                    text: 'Fazer Check-in',
                    onClick: {
                      openLink: { url: `${deepLink}?tab=checkin` }
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  };
}

// ============================================
// TEMPLATE: Task Overdue
// ============================================

function buildTaskOverdueCard(notification) {
  const payload = notification.payload;
  const deepLink = buildDeepLink(payload.deep_link || '/okr/atividades');
  const daysOverdue = payload.days_overdue || 1;
  const itemEmoji = payload.item_type ? getItemTypeEmoji(payload.item_type) : '📋';
  
  // Urgency indicator based on days overdue
  let urgencyEmoji = '⚠️';
  let urgencyText = 'Atenção necessária';
  if (daysOverdue >= 7) {
    urgencyEmoji = '🚨';
    urgencyText = 'Atraso crítico';
  } else if (daysOverdue >= 3) {
    urgencyEmoji = '❗';
    urgencyText = 'Atraso significativo';
  }
  
  const widgets = [
    {
      decoratedText: {
        startIcon: { knownIcon: 'DESCRIPTION' },
        topLabel: 'Tarefa',
        text: `<b>${payload.title || 'Tarefa'}</b>`
      }
    },
    {
      decoratedText: {
        startIcon: { knownIcon: 'CLOCK' },
        topLabel: 'Prazo Original',
        text: formatDate(payload.due_date)
      }
    },
    {
      decoratedText: {
        startIcon: { knownIcon: 'EVENT_BUSY' },
        topLabel: 'Dias de Atraso',
        text: `<font color="#D93025"><b>${daysOverdue} dia${daysOverdue > 1 ? 's' : ''}</b></font>`
      }
    }
  ];
  
  // Add sprint context if available
  if (payload.sprint_title) {
    widgets.push({
      decoratedText: {
        startIcon: { knownIcon: 'FLIGHT_ARRIVAL' },
        topLabel: 'Sprint',
        text: payload.sprint_title
      }
    });
  }
  
  return {
    cardId: `task-overdue-${notification.id}`,
    card: {
      header: {
        title: `${urgencyEmoji} Tarefa Atrasada`,
        subtitle: `${itemEmoji} ${urgencyText}`,
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/warning/default/48px.svg',
        imageType: 'CIRCLE'
      },
      sections: [
        {
          header: 'Detalhes',
          collapsible: false,
          widgets
        },
        {
          widgets: [
            {
              textParagraph: {
                text: '💡 <b>Dica:</b> Conclua a tarefa ou atualize o prazo se necessário.'
              }
            }
          ]
        },
        {
          widgets: [
            {
              buttonList: {
                buttons: [
                  {
                    text: 'Ver Tarefa',
                    onClick: {
                      openLink: { url: deepLink }
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  };
}

// ============================================
// MAIN BUILDER FUNCTION
// ============================================

/**
 * Build a message card based on notification type
 * 
 * @param {object} notification - The notification from outbox
 * @returns {{card: object, fallbackText: string}}
 */
function buildNotificationCard(notification) {
  const builders = {
    'task_assigned': buildTaskAssignedCard,
    'sprint_reminder_48h': buildSprintReminderCard,
    'task_overdue': buildTaskOverdueCard
  };
  
  const builder = builders[notification.type];
  
  if (!builder) {
    // Fallback for unknown types
    const payload = notification.payload;
    return {
      card: {
        cardId: `notification-${notification.id}`,
        card: {
          header: {
            title: '🔔 Notificação OKR',
            subtitle: `Olá, ${payload.recipient_name || 'Usuário'}!`
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: payload.title || payload.sprint_title || 'Você tem uma nova notificação.'
                  }
                }
              ]
            },
            {
              widgets: [
                {
                  buttonList: {
                    buttons: [
                      {
                        text: 'Ver no Sistema',
                        onClick: {
                          openLink: { url: buildDeepLink(payload.deep_link || '/okr') }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      },
      fallbackText: `🔔 Notificação OKR: ${payload.title || payload.sprint_title || 'Nova notificação'}`
    };
  }
  
  const card = builder(notification);
  const payload = notification.payload;
  
  // Generate fallback text for push notification
  const fallbackTexts = {
    'task_assigned': `📋 Nova tarefa: ${payload.title || 'Tarefa'}${payload.due_date ? ` (prazo: ${formatDate(payload.due_date)})` : ''}`,
    'sprint_reminder_48h': `⏰ Lembrete: A sprint "${payload.sprint_title}" termina em 48h!`,
    'task_overdue': `🚨 Tarefa atrasada: ${payload.title || 'Tarefa'} (${payload.days_overdue} dia${payload.days_overdue > 1 ? 's' : ''} de atraso)`
  };
  
  return {
    card,
    fallbackText: fallbackTexts[notification.type] || '🔔 Nova notificação OKR'
  };
}

/**
 * Build a simple text message (for when cards are not needed)
 */
function buildTextMessage(notification) {
  const payload = notification.payload;
  const deepLink = buildDeepLink(payload.deep_link || '/okr');
  
  const messages = {
    'task_assigned': `📋 *Nova Tarefa Atribuída*\n\n*${payload.title || 'Tarefa'}*${payload.sprint_title ? `\nSprint: ${payload.sprint_title}` : ''}${payload.due_date ? `\nPrazo: ${formatDate(payload.due_date)}` : ''}\n\n👉 ${deepLink}`,
    
    'sprint_reminder_48h': `⏰ *Lembrete de Sprint*\n\nA sprint *${payload.sprint_title || 'Sprint'}* termina em 48h!\n\nDepartamento: ${payload.department || 'Geral'}\nData fim: ${formatDate(payload.end_date)}\n\n📝 Lembre-se de atualizar as iniciativas e fazer o check-in!\n\n👉 ${deepLink}`,
    
    'task_overdue': `🚨 *Tarefa Atrasada*\n\n*${payload.title || 'Tarefa'}*${payload.sprint_title ? `\nSprint: ${payload.sprint_title}` : ''}\n\n⚠️ Atrasada há ${payload.days_overdue} dia${payload.days_overdue > 1 ? 's' : ''}\nPrazo original: ${formatDate(payload.due_date)}\n\n👉 ${deepLink}`
  };
  
  return messages[notification.type] || `🔔 *Notificação OKR*\n\n${payload.title || payload.sprint_title || 'Nova notificação'}\n\n👉 ${deepLink}`;
}

module.exports = {
  buildNotificationCard,
  buildTextMessage,
  buildTaskAssignedCard,
  buildSprintReminderCard,
  buildTaskOverdueCard,
  formatDate,
  getPriorityIndicator,
  getItemTypeEmoji,
  buildDeepLink
};

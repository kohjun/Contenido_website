// calendar.js
if (!window.calendarInitialized) {
    const container = document.getElementById('calendar');
    const currentDateElement = document.getElementById('current-date');
  
    // Calendar initialization
    const calendar = new tui.Calendar(container, {
      defaultView: 'month',
      month: {
        dayNames: ['일', '월', '화', '수', '목', '금', '토'],
        isAlways6Weeks: false,
      },
      calendars: [
        {
          id: 'cal1',
          name: '정규 이벤트',
          backgroundColor: '#03bd9e',
        },
        {
          id: 'cal2',
          name: '정기모임',
          backgroundColor: '#00a9ff',
        }
      ],
      useFormPopup: false,
      useDetailPopup: true,
      gridSelection: {
        enableDblClick: false,
        enableClick: false,
      }
    });
  
    // Load events from server
    async function loadEvents() {
      try {
        const response = await fetch('/events/calendar');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const calendarEvents = await response.json();
        
        // Clear existing events
        calendar.clear();
        
        // Create events in calendar
        calendar.createEvents(calendarEvents);
      } catch (error) {
        console.error('Error loading events:', error);
      }
    }
  
    // Update current date display
    function updateCurrentDate() {
      const date = calendar.getDate();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      currentDateElement.textContent = `${year}년 ${month}월`;
    }
  
    // Event Handlers
    calendar.on('beforeCreateEvent', event => {
      calendar.createEvents([event]);
    });
  
    calendar.on('beforeUpdateEvent', ({event, changes}) => {
      calendar.updateEvent(event.id, event.calendarId, changes);
    });
  
    calendar.on('beforeDeleteEvent', event => {
      calendar.deleteEvent(event.id, event.calendarId);
    });
  
    // UI Event Listeners
    document.getElementById('change-view').addEventListener('click', () => {
      const currentView = calendar.getViewName();
      calendar.changeView(currentView === 'week' ? 'month' : 'week');
      updateCurrentDate();
    });
  
    document.getElementById('prev-week').addEventListener('click', () => {
      calendar.prev();
      updateCurrentDate();
    });
  
    document.getElementById('this-week').addEventListener('click', () => {
      calendar.today();
      updateCurrentDate();
    });
  
    document.getElementById('next-week').addEventListener('click', () => {
      calendar.next();
      updateCurrentDate();
    });
  
    // Initialize
    updateCurrentDate();
    loadEvents();
    
    // Auto refresh events every 5 minutes
    setInterval(loadEvents, 5 * 60 * 1000);
    
    // Refresh when window gains focus
    window.addEventListener('focus', loadEvents);
  
    window.calendarInitialized = true;
  }
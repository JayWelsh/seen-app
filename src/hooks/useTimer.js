import { reactive, computed, onUnmounted } from 'vue';


let globalTimer = null;
let globalTimerListeners = [];

function globalTimerTick() {
  globalTimerListeners.forEach(callbackfn => callbackfn(Date.now()));
}

function addListener(listener) {
  globalTimerListeners.push(listener);
  if (globalTimerListeners.length === 1) {
    globalTimer = setInterval(globalTimerTick, 1000);
  }
}
function removeListener(listener) {
  globalTimerListeners = globalTimerListeners.filter(i => i != listener);
  if (globalTimerListeners.length === 0) {
    clearInterval(globalTimer);
  }
}


export default function useTimer() {
  const state = reactive({
    startDate: null,
    endDate: null,
    value: '',
    percentage: 0.0,
  });

  const percentage = computed(() => state.percentage);
  const value = computed(() => state.value);

  function subscribe() {
    addListener(tick);
  }

  function unsubscribe() {
    removeListener(tick);
  }

  function tick(now) {
    // Needs recalculation every tick because of ability to add more time
    let duration;
    let progress;
    let progressLeft;

    if (state.endDate != null) {
      duration = state.endDate - state.startDate;
      progress = now - state.startDate;
      progressLeft = state.endDate - now;
    } else {
      progress = now - state.startDate;
      duration = progress;
      progressLeft = progress;
    }

    state.percentage = +(progress / duration).toFixed(2);

    if (progressLeft <= 0) {
      state.value = 'Auction ended';
      endTimer();
    } else {
      state.value = formatter(progressLeft);
    }
  }

  function startTimer(options) {
    unsubscribe();
    const {
      startDate,
      endDate = null,
    } = options;

    const now = Date.now();
    const start = new Date(startDate).getTime();
    const end = endDate == null ? null : new Date(endDate).getTime();


    if (now < start) {
      unsubscribe();
      state.percentage = 0.0;
      state.value = 'Comming soon';
      return;
    }

    if (end != null && now > end) {
      unsubscribe();
      state.percentage = 1.0;
      state.value = 'Auction ended';
      return;
    }

    state.startDate = start;
    state.endDate = end;
    state.value = 'Loading...';

    unsubscribe();
    subscribe();
  }

  function addSeconds(seconds) {
    state.endDate = state.endDate + (seconds * 1000);
    tick(Date.now());
  }

  function endTimer() {
    unsubscribe();
  }

  onUnmounted(() => {
    unsubscribe();
  });

  // Formatter
  function formatter(time) {
    const total = 0 | (time / 1000);
    const seconds = Math.floor((total) % 60);
    const minutes = Math.floor((total / 60) % 60);
    const hours = Math.floor((total / (60 * 60)) % 24);
    const days = Math.floor(total / (60 * 60 * 24));

    if (days > 0 || hours > 24) {
      return `${days}d ${hours}h ${minutes}m`;
    } else {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
  }

  return {
    startTimer,
    endTimer,
    addSeconds,
    percentage,
    value,
  };
}
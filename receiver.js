/* global cast */
(() => {
  'use strict';

  const context = cast.framework.CastReceiverContext.getInstance();
  const playerManager = context.getPlayerManager();
  const playerElement = document.getElementById('quvex-player');
  const formatBadge = document.getElementById('format-badge');
  const formatLabel = document.getElementById('format-label');

  let lastLoadRequest = null;
  let retryTimer = null;
  let retryAttempt = 0;
  let recoveryLoad = false;
  let lastLoadWasLiveRadio = false;

  const messageType = cast.framework.messages.MessageType;
  const eventType = cast.framework.events.EventType;

  function mediaCustomData() {
    const media = playerManager.getMediaInformation();
    return media && media.customData ? media.customData : {};
  }

  function isLiveRadio() {
    const custom = mediaCustomData();
    return custom.quvexSource === 'radio' || custom.live === true || lastLoadWasLiveRadio;
  }

  function readableFormat(custom) {
    if (custom.quvexSource === 'radio' || custom.live === true) {
      const parts = ['LIVE RADIO'];
      if (custom.codec) parts.push(String(custom.codec).toUpperCase());
      if (Number(custom.bitRate) > 0) parts.push(`${custom.bitRate} KBPS`);
      return parts.join('  •  ');
    }

    const parts = [];
    if (Number(custom.sampleRate) > 0) {
      const khz = Number(custom.sampleRate) / 1000;
      parts.push(`${Number.isInteger(khz) ? khz : khz.toFixed(1)} KHZ`);
    }
    if (Number(custom.bitRate) > 0) parts.push(`${custom.bitRate} KBPS`);
    if (custom.isPlex === true) parts.push('PLEX');
    else if (custom.isCloud === true) parts.push('CLOUD');
    else parts.push('QUVEX');
    return parts.join('  •  ');
  }

  function refreshChrome() {
    const media = playerManager.getMediaInformation();
    const custom = media && media.customData ? media.customData : {};
    const hasMedia = Boolean(media);
    document.body.classList.toggle('media-active', hasMedia);
    formatBadge.hidden = !hasMedia;
    formatBadge.classList.toggle('live', isLiveRadio());
    formatBadge.classList.remove('recovering');
    formatLabel.textContent = hasMedia ? readableFormat(custom) : 'READY';

    const image = media && media.metadata && Array.isArray(media.metadata.images)
      ? media.metadata.images.find(item => item && item.url)
      : null;
    if (image && image.url) {
      // CAF still owns layout and contrast; this only supplies the ambient art.
      const escapedUrl = String(image.url).replace(/["\\\n\r]/g, '');
      playerElement.style.setProperty(
        '--background-image',
        `linear-gradient(115deg, rgba(5,7,13,.92), rgba(7,9,16,.72)), url("${escapedUrl}")`
      );
    } else {
      playerElement.style.removeProperty('--background-image');
    }
  }

  function clearRetry() {
    if (retryTimer !== null) window.clearTimeout(retryTimer);
    retryTimer = null;
  }

  function scheduleRadioRecovery() {
    if (!isLiveRadio() || !lastLoadRequest || retryTimer !== null) return;
    const delays = [1500, 3000, 6000, 10000, 30000];
    const delay = delays[Math.min(retryAttempt, delays.length - 1)];
    retryAttempt += 1;
    formatBadge.hidden = false;
    formatBadge.classList.remove('live');
    formatBadge.classList.add('recovering');
    formatLabel.textContent = `RECONNECTING  •  ATTEMPT ${retryAttempt}`;

    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      recoveryLoad = true;
      playerManager.load(lastLoadRequest).catch(() => {
        recoveryLoad = false;
        scheduleRadioRecovery();
      });
    }, delay);
  }

  playerManager.setMessageInterceptor(messageType.LOAD, request => {
    clearRetry();
    lastLoadRequest = request;
    const custom = request && request.media && request.media.customData
      ? request.media.customData
      : {};
    lastLoadWasLiveRadio = custom.quvexSource === 'radio' || custom.live === true;
    if (!recoveryLoad) retryAttempt = 0;
    recoveryLoad = false;
    return request;
  });

  // A user-initiated stop is final. It must also cancel a reconnect already
  // queued by a transient live-radio failure.
  playerManager.setMessageInterceptor(messageType.STOP, request => {
    clearRetry();
    lastLoadRequest = null;
    lastLoadWasLiveRadio = false;
    retryAttempt = 0;
    recoveryLoad = false;
    return request;
  });

  playerManager.addEventListener(eventType.PLAYER_LOAD_COMPLETE, () => {
    retryAttempt = 0;
    clearRetry();
    refreshChrome();
  });
  playerManager.addEventListener(eventType.MEDIA_STATUS, refreshChrome);
  playerManager.addEventListener(eventType.ERROR, event => {
    console.warn('Quvex receiver playback error', event && event.detailedErrorCode);
    scheduleRadioRecovery();
  });

  const options = new cast.framework.CastReceiverOptions();
  options.disableIdleTimeout = false;
  options.maxInactivity = 3600;
  context.start(options);
})();

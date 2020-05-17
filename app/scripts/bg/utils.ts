import {browser} from 'webextension-polyfill-ts';
import * as Sentry from '@sentry/browser';
import _ from 'lodash';

import {state} from './state';

const captureException = _.throttle(Sentry.captureException, 2000, {leading: true});

export const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const sendMsg = async (msg: Partial<BgMessage>): Promise<any> => {
  let response;

  console.log(`Sending message: `, msg);

  try {
    response = await browser.runtime.sendMessage(chrome.runtime.id, msg);
  } catch (e) {
    return null;
  }

  return response;
};

export const sendError = async (err: Error) => {
  if (!err) return;

  if (state.prefs.errorTelemetry) {
    captureException(err);
  }

  if (process.env.NODE_ENV === 'production') return;

  await sendMsg({type: 'error', e: {
    message: err.message,
    stack: err.stack || new Error().stack,
  }});
}

export const chromeHandler = (handler) => {
  return async (...args) => {
    if (chrome.runtime.lastError) {
      await sendError(new Error(chrome.runtime.lastError.message));
    }

    try {
      return await handler(...args);
    } catch (e) {
      await sendError(e);
    }
  }
}
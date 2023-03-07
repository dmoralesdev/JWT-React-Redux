//url for backend API to a refreshToken method
const API_REFRESH_TOKEN = `${process.env.NEXT_PUBLIC_ENV_API}/RefreshToken`

//This actions need to be defined in the Redux store
import {
  setToken,
  refreshingToken,
  doneRefreshingToken,
  freshTokenCountdownId,
} from '../../store/actions'

//Get a new refresed token from the backend API
const getRefreshedToken = async () => {
  const request = new Request(API_REFRESH_TOKEN, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })

  const response = await fetch(request)
  return response.json()
}

export const ticksToDate = (ticks) => {
  let ticksToMicrotime = ticks / 10000
  //ticks are recorded from 1/1/1; get microtime difference from 1/1/1/ to 1/1/1970
  let epochMicrotimeDiff = Math.abs(new Date(Date.UTC(0, 0, 1)).setFullYear(0))
  //new date is ticks, converted to microtime, minus difference from epoch microtime
  return new Date(ticksToMicrotime - epochMicrotimeDiff)
}

export function refreshToken(dispatch) {
  var freshTokenPromise = getRefreshedToken()
    .then((response) => {
      dispatch(doneRefreshingToken())
      dispatch(setToken(response))
      refreshTokenCountdown(
        ticksToDate(response.token.expiration) - new Date(),
        dispatch
      )
      return response
        ? Promise.resolve(response)
        : Promise.reject({ message: 'could not refresh token' })
    })
    .catch((e) => {
      console.log('Error refreshing token', e)
      dispatch(doneRefreshingToken())
      return Promise.reject(e)
    })

  // we want to keep track of token promise in the state so that we don't try to refresh
  // the token again while refreshing is in process
  dispatch(refreshingToken(freshTokenPromise))

  return freshTokenPromise
}

// Abort potentially existing prior timeout for a refresh
export function abortRefreshTokenCountdown(refreshTimeoutId) {
  if (refreshTimeoutId) {
    console.log('Refresh Token aborted: ', refreshTimeoutId)
    clearTimeout(refreshTimeoutId)
  }
}

// This countdown feature is used to renew the JWT before it's no longer valid
// in a way that is transparent to the user.
export function refreshTokenCountdown(delay, dispatch) {
  const safetyWindow = 30000
  let refreshTimeoutId

  console.log('Refresh Token Countdown: ', delay - safetyWindow)

  refreshTimeoutId = setTimeout(() => {
    refreshToken(dispatch)
  }, delay - safetyWindow) // Validity period of the token in milliseconds, minus safetyWindow milliseconds
  //}, 60000 - safetyWindow) // Validity period of the token in milliseconds, minus safetyWindow milliseconds
  dispatch(freshTokenCountdownId(refreshTimeoutId))
}

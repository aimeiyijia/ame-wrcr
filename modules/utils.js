export function awaitWraper(promise) {
  return promise.then(res => [null, res]).catch(err => [err, undefined])
}

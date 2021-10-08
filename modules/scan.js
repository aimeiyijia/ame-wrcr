// 内置预设扫描
const testPreset = presets

function awaitWraper(promise) {
  return promise.then(res => [null, res]).catch(err => [err, undefined])
}

// 检测摄像头是否可用
function isSupportsWebRTC() {
  if (!navigator.mediaDevices.getUserMedia) {
    console.log('mediaDevices is not available')
    return false
  }
  return true
}

// 请求摄像头授权
async function requestCameraAuth() {
  const [err, res] = await awaitWraper(
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    })
  )
  stopTrack(res)
  return true
}

// 清除所有的视频轨道
function stopTrack(stream) {
  stream.getTracks().forEach(track => {
    track.stop()
  })
}

// 获取所有的连接摄像头
async function getAllVideoinputs() {
  const devicesVideo = []
  try {
    let deviceInfos = await navigator.mediaDevices.enumerateDevices({
      video: true,
      audio: false,
    })
    for (let i = 0; i !== deviceInfos.length; ++i) {
      const deviceInfo = deviceInfos[i]
      if (deviceInfo.kind === 'videoinput') {
        devicesVideo.push(deviceInfo)
      }
    }
    return devicesVideo
  } catch (error) {
    console.log(error, '获取摄像头列表')
    return devicesVideo
  }
}

// 创建video元素
function createVideoEl() {
  const videoEl = document.createElement('video')
  videoEl.autoplay = 'autoplay'
  // videoEl.playsinline = 'playsinline'
  // videoEl.controls = 'controls'
  // videoEl.src = './test.mp4'
  // document.body.appendChild(videoEl)
  return videoEl
}

// 判断视频元数据加载完成，这步未完成就无法得知渲染出的视频尺寸
function isVideoMetaLoaded(video) {
  return new Promise((resolve, reject) => {
    try {
      video.addEventListener('loadedmetadata', () => {
        resolve(true)
      })
    } catch (error) {
      reject(false)
      console.log(error, 'MetaLoadFailed')
    }
  })
}
// 获取视频的相关属性（宽，高）
// video的 videoWidth 和 videoHeight 属性为视频真实宽高，这两个属性为只读属性；
// video的 width 和 height 属性为视频在页面上显示的尺寸，属性可读写；
function getVideoWH(video) {
  return {
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
  }
}

// 利用视频（不是视频元素）的实际大小宽 高 与预设 宽高比较，相同则摄像头满足该预设，否则不满足
function isEqualGivenPreset(preset, video) {
  const { videoWidth, videoHeight } = getVideoWH(video)
  if (videoWidth * videoHeight > 0) {
    if (preset.width + 'x' + preset.height === videoWidth + 'x' + videoHeight) {
      return true
    } else {
      return false
    }
  }
}

// 用给定的摄像头及摄像头请求参数发起 getUserMedia（不扫描音频轨道）
async function getUserMedia(candidate, deviceId) {
  try {
    let constraints = {
      audio: false,
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { exact: candidate.width },
        height: { exact: candidate.height },
      },
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    return stream
  } catch (error) {
    console.log(error, deviceId, candidate, 'getUserMedia Error')
    return false
  }
}

// 给定的摄像头匹配内置预设
async function loopPresetsMatchCamera(preset, deviceId) {
  let stream = null
  // 创建视频元素
  const videoEl = createVideoEl()
  // 记录摄像头扫描结果
  const results = {
    [deviceId]: [],
  }
  for (let i of preset) {
    stream = await getUserMedia(i, deviceId)
    if (stream) {
      videoEl.srcObject = stream

      const isLoad = await isVideoMetaLoaded(videoEl)
      if (isLoad) {
        if (isEqualGivenPreset(i, videoEl)) {
          results[deviceId].push(i)
        }
      }
    }
  }
  stopTrack(stream)
  return results
}

async function initScan() {
  try {
    if (!isSupportsWebRTC()) return false

    const isAuth = await requestCameraAuth()
    if (!isAuth) return false
    return true
  } catch (error) {
    return false
  }
}

// 执行扫描
async function autoScan() {
  if (!(await initScan())) return

  // 获取所有的摄像头
  const videos = await getAllVideoinputs()

  console.log(videos, '所有的视频轨道')

  // 记录摄像头扫描结果
  const results = {}

  for (let video of videos) {
    const result = await loopPresetsMatchCamera(testPreset, video.deviceId)
    Object.assign(results, result)
  }

  return results
}

// 给定的摄像头扫描
async function scanById(deviceId) {
  if (!(await initScan())) return

  const result = await loopPresetsMatchCamera(testPreset, deviceId)
  return result
}
// 给定的预设扫描
async function scanByPresets(presets) {
  if (!(await initScan())) return

  // 获取所有的摄像头
  const videos = await getAllVideoinputs()

  // 记录摄像头扫描结果
  const results = {}

  for (let video of videos) {
    const result = await loopPresetsMatchCamera(presets, video.deviceId)
    Object.assign(results, result)
  }

  return results
}
// 给定的摄像头及预设扫描
async function scan(deviceId, presets) {
  if (!(await initScan())) return

  const result = await loopPresetsMatchCamera(presets, deviceId)
  return result
}

// 内置预设扫描
const testPreset = presets

function awaitWraper(promise) {
  return promise.then(res => [null, res]).catch(err => [err, undefined])
}
// 检测摄像头是否可用
async function isSupportsWebRTC() {
  if (!navigator.mediaDevices.getUserMedia) {
    console.log('mediaDevices is not available')
    return false
  }
  return true
}
// 清除所有的视频轨道
function stopTrack(stream) {
  stream.getTracks().forEach(track => {
    track.stop()
  })
}

// 获取所有的连接摄像头
async function getAllVideoinouts() {
  // 先强制用户授权，才能获取已连接的摄像头
  const [err, res] = await awaitWraper(
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    })
  )
  if (res) {
    let deviceInfos = await navigator.mediaDevices.enumerateDevices({
      video: true,
      audio: false,
    })
    const devicesVideo = []
    for (let i = 0; i !== deviceInfos.length; ++i) {
      const deviceInfo = deviceInfos[i]
      if (deviceInfo.kind === 'videoinput') {
        devicesVideo.push(deviceInfo)
      }
    }
    stopTrack(res)
    return devicesVideo
  }
}

// 创建video元素
function createVideoEl() {
  const videoEl = document.createElement('video')
  videoEl.autoplay = 'autoplay'
  videoEl.playsinline = 'playsinline'
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

// 利用视频（不是视频元素）的实际大小宽 高 与预设 宽高想比较，相同则摄像头满足该预设，否则不满足
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
async function getUserMedia(candidate, device) {
  try {
    let constraints = {
      audio: false,
      video: {
        deviceId: device.id ? { exact: device.id } : undefined,
        width: { exact: candidate.width },
        height: { exact: candidate.height },
      },
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    return stream
  } catch (error) {
    console.error(error, 'getUserMedia Error')
    return false
  }
}

// 摄像头是否能正常使用（获取到流）
async function isCameraCanUse(device) {
  try {
    let constraints = {
      audio: false,
      video: {
        deviceId: device.id ? { exact: device.id } : undefined,
      },
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    return stream
  } catch (error) {
    console.error(error, 'camera is can not use')
    return false
  }
}

// 执行扫描
async function WRCR() {
  // 创建视频元素
  const videoEl = createVideoEl()

  // 获取所有的摄像头
  const videos = await getAllVideoinouts()

  console.time()

  console.log(videos, '所有的视频轨道')

  // 记录摄像头扫描结果
  const results = {}

  for (let video of videos) {
    let stream = null
    // 以摄像头deviceId为key,存储最终的扫描结果
    results[video.deviceId] = []
    // 获取视频流
    for (let i of testPreset) {
      stream = await getUserMedia(i, {
        id: video.deviceId,
      })
      if (stream) {
        videoEl.srcObject = stream

        const isLoad = await isVideoMetaLoaded(videoEl)
        if (isLoad) {
          if (isEqualGivenPreset(i, videoEl)) {
            results[video.deviceId].push(i)
          }
        }
      }
    }
    stopTrack(stream)
  }

  console.timeEnd()

  return results
}

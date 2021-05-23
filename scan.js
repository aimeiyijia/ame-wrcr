const testPreset = [
  {
    label: '1080p(FHD)',
    width: 1920,
    height: 1080,
    ratio: '16:9',
  },
  {
    label: '720p(HD)',
    width: 1280,
    height: 720,
    scale: '16:9',
  },
]

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
  videoEl.controls = 'controls'
  // videoEl.src = './test.mp4'
  document.body.appendChild(videoEl)
  return videoEl
}

// 判断视频元数据加载完成
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

// 利用视频的实际大小宽 高 与预设 宽高想比较，相同则摄像头满足该预设，否则不满足
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

async function WRCR() {
  // 创建视频元素
  const videoEl = createVideoEl()

  // 获取所有的摄像头
  const videos = await getAllVideoinouts()

  console.log(videos)
  const resule = {}

  for (let video of videos) {
    resule[video.deviceId] = []
    // 获取视频流
    for (let i of testPreset) {
      const stream = await getUserMedia(i, {
        id: video.deviceId,
      })
      if (stream) {
        videoEl.width = i.width
        videoEl.height = i.height
        videoEl.srcObject = stream

        const re = await isVideoMetaLoaded(videoEl)
        if (re) {
          console.log(i)
          console.log(isEqualGivenPreset(i, videoEl))
          if (isEqualGivenPreset(i, videoEl)) {
            resule[video.deviceId].push(i)
          }
        }
      }
    }
  }

  console.log(resule, '123')

  // d001a5278e67f231ec1bd4111eb36490937a1ef3d5a23de9fac7cc40868f75e5
}

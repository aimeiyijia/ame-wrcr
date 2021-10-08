import { awaitWraper } from './utils.js'
import buildinPresets from './presets.js'
class WRCR {
  constructor() {
    // this._init()
  }
  // 初始化
  async _init() {
    const isSupport = this._isSupportsWebRTC()
    const isAuth = await this._requestCameraAuth()
    if (isSupport && isAuth) {
      return true
    }
    return false
  }

  // 自动扫描
  // 自动获取连接的摄像头列表，并使用内置预设进行扫描
  async autoScan() {
    if (!(await this._init())) return
    // 获取所有的摄像头
    const videos = await this._getAllVideoinputs()

    console.log(videos, '视频轨道')
    // 记录摄像头扫描结果
    const results = {}

    for (let video of videos) {
      const result = await this._loopPresetsMatchCamera(
        buildinPresets,
        video.deviceId
      )
      Object.assign(results, result)
    }

    return results
  }

  // 根据指定的摄像头Id，并使用内置预设进行扫描
  async scanById(deviceId) {
    if (!(await this._init())) return
    const result = await this._loopPresetsMatchCamera(buildinPresets, deviceId)
    return result
  }

  // 自动获取连接的摄像头列表，并使用指定预设进行扫描
  async scanByPresets(presets) {
    if (!(await this._init())) return
    // 获取所有的摄像头
    const videos = await this._getAllVideoinputs()

    // 记录摄像头扫描结果
    const results = {}

    for (let video of videos) {
      const result = await this._loopPresetsMatchCamera(presets, video.deviceId)
      Object.assign(results, result)
    }

    return results
  }

  // 指定摄像头Id，并使用指定预设进行扫描
  async scanBy(deviceId, presets) {
    if (!(await this._init())) return
    const result = await this._loopPresetsMatchCamera(presets, deviceId)
    return result
  }

  // 检测摄像头是否可用
  _isSupportsWebRTC() {
    if (!navigator.mediaDevices.getUserMedia) {
      console.log('mediaDevices is not available')
      return false
    }
    return true
  }

  // 请求摄像头授权
  async _requestCameraAuth() {
    const [err, res] = await awaitWraper(
      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      })
    )
    this._stopTrack(res)
    if (err) return false
    return true
  }

  // 清除所有的视频轨道
  _stopTrack(stream) {
    stream.getTracks().forEach(track => {
      track.stop()
    })
  }

  // 获取所有的连接摄像头
  async _getAllVideoinputs() {
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
  _createVideoEl() {
    const videoEl = document.createElement('video')
    videoEl.autoplay = 'autoplay'
    // videoEl.playsinline = 'playsinline'
    // videoEl.controls = 'controls'
    // videoEl.src = './test.mp4'
    // document.body.appendChild(videoEl)
    return videoEl
  }

  // 判断视频元数据加载完成，这步未完成就无法得知渲染出的视频尺寸
  _isVideoMetaLoaded(video) {
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
  _getVideoWH(video) {
    return {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
    }
  }

  // 利用视频（不是视频元素）的实际大小宽 高 与预设 宽高比较，相同则摄像头满足该预设，否则不满足
  _isEqualGivenPreset(preset, video) {
    const { videoWidth, videoHeight } = this._getVideoWH(video)
    if (videoWidth * videoHeight > 0) {
      if (
        preset.width + 'x' + preset.height ===
        videoWidth + 'x' + videoHeight
      ) {
        return true
      } else {
        return false
      }
    }
  }

  // 用给定的摄像头及摄像头请求参数发起 getUserMedia（不扫描音频轨道）
  async _getUserMedia(candidate, deviceId) {
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
  async _loopPresetsMatchCamera(preset, deviceId) {
    let stream = null
    // 创建视频元素
    const videoEl = this._createVideoEl()
    // 记录摄像头扫描结果
    const results = {
      [deviceId]: [],
    }
    for (let i of preset) {
      stream = await this._getUserMedia(i, deviceId)
      if (stream) {
        videoEl.srcObject = stream

        const isLoad = await this._isVideoMetaLoaded(videoEl)
        if (isLoad) {
          if (this._isEqualGivenPreset(i, videoEl)) {
            results[deviceId].push(i)
          }
        }
      }
    }
    this._stopTrack(stream)
    return results
  }
}

export default WRCR

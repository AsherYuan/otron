var DeviceStatusUtil = module.exports;

DeviceStatusUtil.getInitStatus = function(deviceType) {
  var p=0, t=0, w=0, m=0, c=0, v=0;

  var month = new Date().getMonth() + 1;

  // 空调操作
  if(deviceType === '空调') {
    if(month >= 12 && month <= 2) {
      m = 0;
    } else if(month > 2 && month < 6) {
      m = 1;
    } else if(month > 5 && month < 10) {
      m = 2;
    } else if(month > 10 && month < 12) {
      m = 1;
    }
  } else if(deviceType === '电视') {

  } else {
    // TODO
  }


  var status = {
    power:0,
    temerature:0,
    wind:0,
    mode:m,
    channel:0,
    volume:0,
    tv_ismute:'0'
  }


  return status;
};
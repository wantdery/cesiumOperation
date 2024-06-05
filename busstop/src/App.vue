<template>
  <div id="cesiumContainer"></div>
  <div class="infoContainer">
    <div class="headerBox">
      <div>
        {{
          stationStatus.currentStation
            ? stationStatus.currentStation
            : loadDataCopy.stations[0].name
        }}
      </div>
      <div style="font-size: 80px; justify-self: center">→</div>
      <div>
        {{
          stationStatus.nextStation
            ? stationStatus.nextStation
            : loadDataCopy.stations[1].name
        }}
      </div>
    </div>
    <div class="bodyBox">
      <transition name="move">
        <i
          class="iconfont icon-a-icongongjiaoche animateBus"
          :style="{
            top: busIconPosition.top + '%',
            left: busIconPosition.left + '%',
            transition: 'all 0.5s ease',
          }"
          @click="toTrackTheBus"
        ></i>
      </transition>

      <div
        class="stationsName"
        v-for="(item, index) in loadDataCopy.stations"
        :key="index + item"
        :class="{ activeStation: stationStatus.currentStation === item.name }"
        @click="transmissionToStation(item)"
      >
        <span>{{ item.station_num }}</span> {{ item.name }}
      </div>
    </div>
    <div class="footerBox">
      <div class="topBox">
        <div class="iconContainer">
          <i
            class="iconfont icon-bofang"
            v-show="!isAnimationRun"
            @click="toBegin"
          ></i>
          <i
            class="iconfont icon-zanting"
            v-show="isAnimationRun"
            @click="toBegin"
          ></i>
          <i class="iconfont icon-kuaitui-page" @click="decreaseSpeed"></i>
          <i class="iconfont icon-kuaijin-page" @click="increaseSpeed"></i>
          <i class="iconfont icon-shuaxin" @click="toReset"></i>
        </div>
        <div class="btnContainer">
          <button class="control" @click="toTrackTheBus">跟随视角</button>
          <button class="control" @click="firstPersonView">车内视角</button>
          <button class="control" @click="freeCamera">自由视角</button>
        </div>
        <div class="speed">{{ busSpeed }}<span>m/s</span></div>
      </div>
      <div class="bottomBox">
        <div class="processBarO">
          <div
            class="processBarI"
            :style="`width:${
              (diffTimeCopy / timeSumCopy) * 100 >= 100
                ? 100
                : (diffTimeCopy / timeSumCopy) * 100
            }%`"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import {
  ref,
  onMounted,
  getCurrentInstance,
  watch,
  onUnmounted,
  computed,
} from "vue";
import modifyMap from "./tool/filterColor.js";
const { appContext } = getCurrentInstance();
import loadData from "./assets/load.json";
import Bubble from "./tool/bubble";
import { getSiteTime, getSampleData, spaceDistance } from "./tool/trajectoty";
const global = appContext.config.globalProperties;
//组件先挂载到页面，地图再实例化到组件中
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwZWI2YTk3ZC1mZWI4LTQyMDUtYmI1Ny00YzFkYTFmYmIwYzIiLCJpZCI6MjE3MTU4LCJpYXQiOjE3MTY0Mjc1MDZ9.dC3r6S37sujU0HyCKe-k_flKuGM9kyy_oqkd9eQutZs";
let viewer;
let bubble;
const isAnimationRun = ref(false);
const busSpeed = ref(20);
const peopleNumList = ref([
  29, 11, 13, 12, 11, 562, 6416, 4, 61, 64, 64, 618, 17, 118, 486, 12, 681, 13,
  21, 32, 85, 62, 482, 26, 48, 18, 62, 8999,
]);
let positionValue = ref({
  top: 2,
  left: 3.5,
});
let index = 1;
onMounted(() => {
  //viewer是操作地图api的开始
  const layer = new Cesium.UrlTemplateImageryProvider({
    url: "http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
    minimumLevel: 4,
    maximumLevel: 18,
  });
  viewer = new Cesium.Viewer("cesiumContainer", {
    imageryProvider: layer,
    timeline: false,
    animation: false,
    infoBox: false,
    selectionIndicator: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    navigationHelpButton: false,
    sceneModePicker: false,
  });
  global.$viewer = viewer;
  modifyMap(viewer, {
    invertColor: true,
    filterRGB: [70, 110, 120],
  });
  initData();
});
onUnmounted(() => {
  // if (positionWatch) {
  //   positionWatch();
  //   positionWatch = null;
  // }
  bubble && bubble.windowClose();
  viewer.clock.onTick.removeEventListener(fpv);
  // console.log(station);
  viewer.trackedEntity = null;
});
let positions = [];
const loadDataCopy = ref(loadData);
const lengthPercent = ref(0);
const initData = () => {
  const nowPosition = [114.406979, 30.462812];
  console.log(loadData);
  let xArr = loadData.xs.split(",");
  let yArr = loadData.ys.split(",");
  xArr.forEach((item, index) => {
    positions.push(
      Cesium.Cartesian3.fromDegrees(Number(item), Number(yArr[index]))
    );
  });
  let newArray = [];
  xArr.forEach((item, index) => {
    newArray.push([Number(item), Number(yArr[index])]);
  });
  let fullLine = turf.lineString(newArray);
  let startPoint = turf.point(newArray[0]);
  let stopPoint = turf.point(nowPosition);
  var slicedLine = turf.lineSlice(startPoint, stopPoint, fullLine);
  let cutline = turf.lineString(slicedLine.geometry.coordinates);
  const fullLength = turf.length(fullLine);
  const cutLength = turf.length(cutline);
  lengthPercent.value = cutLength / fullLength;
  loadData.stations.forEach((_item, _index) => {
    const stationStop =  turf.point(_item.xy_coords.split(';').map(b=>+b))
    const stationSliced = turf.lineSlice(startPoint, stationStop,fullLine)
    if(turf.length(stationSliced)<cutLength){
      
      index = _index+1
    }
  });
  console.log(index)
  // new Cesium.GeoJsonDataSource.load(slicedLine, {
  //   clampToGround: true,
  // }).then((res) => {
  //   console.log(res.entities.values[0]);
  // });
  const line = viewer.entities.add({
    polyline: {
      positions,
      width: 10,
      material: Cesium.Color.WHITE.withAlpha(0.5),
      clampToGround: true,
    },
  });
  loadData.stations.forEach((item, index) => {
    const position = Cesium.Cartesian3.fromDegrees(
      ...item.xy_coords.split(";").map((a) => Number(a))
    );
    const positionLabel = Cesium.Cartesian3.fromDegrees(
      ...item.xy_coords.split(";").map((a) => Number(a)),
      38
    );
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      Cesium.HeadingPitchRoll.fromDegrees(90, 0, 0)
    );
    viewer.entities.add({
      position,
      orientation,
      model: {
        uri: "/src/assets/model.gltf",
        scale: 0.1,
      },
    });
    viewer.entities.add({
      position: positionLabel,
      id: "label" + index,
      label: {
        text: item.name,
        font: "18px Helvetica",
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.WHITE,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.3),
        showBackground: true,
      },
    });
  });
  viewer.zoomTo(line);
};
let entity;
const increaseSpeed = () => {
  if (viewer.clock.multiplier < -0.1 && viewer.clock.multiplier < 0) {
    viewer.clock.multiplier /= 2;
  } else if (viewer.clock.multiplier > 0) {
    viewer.clock.multiplier *= 2;
  } else if (viewer.clock.multiplier > -0.1 && viewer.clock.multiplier < 0) {
    viewer.clock.multiplier = 0.125;
  }
  busSpeed.value = 20 * viewer.clock.multiplier;
};
const decreaseSpeed = () => {
  if (viewer.clock.multiplier > 0.1 && viewer.clock.multiplier > 0) {
    viewer.clock.multiplier /= 2;
  } else if (viewer.clock.multiplier < 0) {
    viewer.clock.multiplier *= 2;
  } else if (viewer.clock.multiplier < 0.1 && viewer.clock.multiplier > 0) {
    viewer.clock.multiplier = -0.125;
  }
  busSpeed.value = 20 * viewer.clock.multiplier;
};
// const toStop = () => {
//   isAnimationRun.value = !isAnimationRun.value;
//   if (isAnimationRun.value) {
//     viewer.clock.shouldAnimate = true;
//   } else {
//     viewer.clock.shouldAnimate = false;
//   }
// };
const toReset = () => {
  viewer.clock.onTick.removeEventListener(fpv);
  viewer.clock.currentTime = viewer.clock.startTime.clone();
  viewer.clock.shouldAnimate = false;
  isAnimationRun.value = false;
  isFirstRun.value = true;
  viewer.clock.multiplier = 1;
  busSpeed.value = 20;
  viewer.trackedEntity = entity;
};
const isFirstRun = ref(true);
const timeSumCopy = ref(1);
const stationInfo = ref({});
const toBegin = () => {
  let timeObj = getSiteTime(positions, 20);
  timeSumCopy.value = timeObj.timeSum;
  const start = Cesium.JulianDate.fromDate(new Date(2015, 2, 25, 16));

  const cutTime = timeObj.timeSum * lengthPercent.value;
  const cutStart = Cesium.JulianDate.addSeconds(
    start,
    cutTime,
    new Cesium.JulianDate()
  );

  const stop = Cesium.JulianDate.addSeconds(
    start,
    timeObj.timeSum,
    new Cesium.JulianDate()
  );
  isAnimationRun.value = !isAnimationRun.value;
  if (isAnimationRun.value) {
    viewer.clock.shouldAnimate = true;
  } else {
    viewer.clock.shouldAnimate = false;
  }
  if (!isFirstRun.value) return;
  // if (positionWatch) {
  //   positionWatch();
  //   positionWatch = null;
  // }
  viewer.clock.onTick.removeEventListener(fpv);
  isFirstRun.value = false;
  viewer.clock.shouldAnimate = true;
  viewer.clock.startTime = start.clone();
  viewer.clock.stopTime = stop.clone();
  viewer.clock.currentTime = start.clone();
  if (cutStart) {
    viewer.clock.currentTime = cutStart.clone();
  }
  console.log(viewer.clock.currentTime)
  const position = getSampleData(positions, start, timeObj.siteTime);

  entity = viewer.entities.add({
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: start,
        stop: stop,
      }),
    ]),
    model: {
      uri: "/src/assets/bus.gltf",
      minimumPixelSize: 40,
      scale: 1.2,
    },
    position: position,
    orientation: new Cesium.VelocityOrientationProperty(position),
  });

  viewer.trackedEntity = entity;
  viewer.clock.onTick.addEventListener(tickEventHandler);
};

const diffTimeCopy = ref(0);
const stationStatus = ref({
  currentStation: null, //"民族大道光谷广场",
  nextStation: null, //"民族大道上钱村",
});
const busIconPosition = computed(() => {
  let currentindex = loadData.stations.findIndex((item) => {
    return item.name === stationStatus.value.currentStation;
  });
  if (currentindex === 0) {
    positionValue.value.top = 2;
  }
  if (currentindex > 13) {
    positionValue.value.top = 48.5;
    currentindex = currentindex - 14;
  }
  positionValue.value.left = 3.5 + currentindex * 6.62;
  if (currentindex < 0) {
    positionValue.value.left = 3.5;
  }
  return {
    top: positionValue.value.top,
    left: positionValue.value.left,
  };
});

// watch(busIconPosition, (val) => {
//   console.log(val);
// });
const theBusPosition = ref(null);
const theBusOrientation = ref(null);
const tickEventHandler = () => {
  const diffTime = Cesium.JulianDate.secondsDifference(
    viewer.clock.currentTime,
    Cesium.JulianDate.fromDate(new Date(2015, 2, 25, 16))
  );
  diffTimeCopy.value = diffTime;
  // theBusPosition.value = entity.position.getValue(viewer.clock.currentTime);
  // theBusOrientation.value = entity.orientation.getValue(
  //   viewer.clock.currentTime
  // );
  if(index>loadData.stations.length) return
  loadData.peopleNum = peopleNumList.value[index - 1];
  let a = entity.position.getValue(viewer.clock.currentTime);
  if (!a) return;
  bubble && bubble.windowClose();
  bubble = new Bubble({
    position: a,
    viewer: viewer,
    stationInfo: loadData,
  });
  const b = Cesium.Cartesian3.fromDegrees(
    ...loadData.stations[index].xy_coords.split(";").map((a) => +a)
  );
  stationStatus.value.currentStation = loadData.stations[index - 1].name;
  stationStatus.value.nextStation = loadData.stations[index].name;
  const distance = spaceDistance(a, b);
  if (distance < 10) {
    index++;
    viewer.clock.shouldAnimate = false;
    setTimeout(() => {
      viewer.clock.shouldAnimate = true;
    }, 1500);
    // if (index === loadData.stations.length) {
    //   index = 1;
    // }
  }
};
let currentLabel;
const transmissionToStation = (station) => {
  // if (positionWatch) {
  //   positionWatch();
  //   positionWatch = null;
  // }
  viewer.clock.onTick.removeEventListener(fpv);
  // console.log(station);
  viewer.trackedEntity = null;
  viewer.camera.flyTo({
    destination: new Cesium.Cartesian3.fromDegrees(
      station.xy_coords.split(";").map((a) => +a)[0] - 0.0,
      station.xy_coords.split(";").map((a) => +a)[1] + 0.0011,
      140
    ), //相机坐标
    orientation: {
      heading: Cesium.Math.toRadians(180),
      pitch: Cesium.Math.toRadians(-45),
      roll: Cesium.Math.toRadians(0),
    },
  });
  if (currentLabel) {
    currentLabel.label.fillColor._value = Cesium.Color.WHITE;
    currentLabel = null;
  }
  let index = loadData.stations.findIndex((item) => item.name === station.name);
  viewer.entities.getById("label" + index).label.fillColor._value =
    Cesium.Color.YELLOW;
  currentLabel = viewer.entities.getById("label" + index);
};
// let positionWatch;
const toTrackTheBus = () => {
  // if (positionWatch) {
  //   positionWatch();
  //   positionWatch = null;
  // }
  viewer.clock.onTick.removeEventListener(fpv);
  if (entity) {
    viewer.trackedEntity = entity;
  }
};
const freeCamera = () => {
  // if (positionWatch) {
  //   positionWatch();
  //   positionWatch = null;
  // }
  viewer.clock.onTick.removeEventListener(fpv);
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  viewer.trackedEntity = null;
};
const fpv = () => {
  viewer.trackedEntity = null;
  var cartographic = Cesium.Cartographic.fromCartesian(
    entity.position.getValue(viewer.clock.currentTime)
  );
  var QueryResultlng = Cesium.Math.toDegrees(cartographic.longitude); //四舍五入 小数点后保留五位
  var QueryResultlat = Cesium.Math.toDegrees(cartographic.latitude);
  // 以下为可实时调整高度
  cartographic.height = 2;
  var test = Cesium.Cartesian3.fromDegrees(
    QueryResultlng,
    QueryResultlat,
    cartographic.height
  );
  var transform = Cesium.Matrix4.fromRotationTranslation(
    Cesium.Matrix3.fromQuaternion(
      entity.orientation.getValue(viewer.clock.currentTime)
    ),
    test
  ); //将偏向角转为3*3矩阵，利用实时点位转为4*4矩阵
  viewer.camera.lookAtTransform(transform, new Cesium.Cartesian3(-1, 0, 0)); //将相机向后面放一点
};
const firstPersonView = () => {
  viewer.clock.onTick.removeEventListener(fpv);
  if (!entity) return;
  viewer.clock.onTick.addEventListener(fpv);
  viewer.trackedEntity = null;
  return;
  // if (positionWatch) {
  //   positionWatch();
  //   positionWatch = null;
  // }
  // positionWatch = watch(
  //   theBusPosition,
  //   (newVal) => {
  //     var cartographic = Cesium.Cartographic.fromCartesian(
  //       theBusPosition.value
  //     );
  //     var QueryResultlng = Cesium.Math.toDegrees(cartographic.longitude); //四舍五入 小数点后保留五位
  //     var QueryResultlat = Cesium.Math.toDegrees(cartographic.latitude);
  //     // 以下为可实时调整高度
  //     cartographic.height = 2;
  //     var test = Cesium.Cartesian3.fromDegrees(
  //       QueryResultlng,
  //       QueryResultlat,
  //       cartographic.height
  //     );
  //     var transform = Cesium.Matrix4.fromRotationTranslation(
  //       Cesium.Matrix3.fromQuaternion(theBusOrientation.value),
  //       test
  //     ); //将偏向角转为3*3矩阵，利用实时点位转为4*4矩阵
  //     viewer.camera.lookAtTransform(transform, new Cesium.Cartesian3(-1, 0, 0)); //将相机向后面放一点
  //   },
  //   {
  //     deep: true,
  //   }
  // );
};
</script>

<style lang="scss" scoped>
#cesiumContainer {
  width: 100vw;
  height: 100vh;
  /* position: absolute; */
  overflow: hidden;
  z-index: -1;
}
#btn {
  font-size: 24px;
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 999;
  width: 70px;
  height: 40px;
}
.infoContainer {
  position: absolute;
  z-index: 999;
  right: 15px;
  top: 120px;
  width: 650px;
  // height: 630px;
  background-color: rgba($color: #000000, $alpha: 0.5);
  .headerBox {
    padding: 0 20px;
    width: 100%;
    font-size: 28px;
    height: 100px;
    background-color: #030e30;
    margin-bottom: 4px;
    border: 1px solid #486581;
    color: white;
    display: flex;
    justify-content: space-between;
    text-align: center;
    line-height: 100px;
    font-weight: 500;
    overflow: hidden;
    white-space: nowrap;
    div {
      flex: 1; /* 使第一个和第三个div分配相等空间 */
    }

    div:nth-child(2) {
      flex: none; /* 取消中间div的弹性伸缩 */
      width: 80px; /* 固定宽度，可以根据需要调整 */
      text-align: center; /* 居中对齐内容 */
      margin: 0 auto; /* 确保中间div与两侧有一定距离 */
    }
  }
  .bodyBox {
    position: relative;
    width: 100%;
    height: 500px;
    background-color: #0f386c;
    margin-bottom: 8px;
    padding: 45px 5% 5px;
    color: white;
    display: grid;
    grid-template-columns: repeat(14, 1fr);
    gap: 16px;
    .animateBus {
      font-size: 38px;
      cursor: pointer;
      position: absolute;
      top: 2%;
      left: 3.5%;
      color: #008dff;
    }
    .stationsName {
      font-size: 17px;
      letter-spacing: 1px;
      overflow: hidden;
      white-space: nowrap;
      writing-mode: vertical-lr;
      text-orientation: upright;
      cursor: pointer;
      span {
        margin-bottom: -5px;
        writing-mode: horizontal-tb;
      }
    }
    .activeStation.stationsName {
      color: yellow;
    }
  }
  .footerBox {
    width: 100%;
    height: 118px;
    background-color: #030e30;
    border: 1px solid #486581;
    font-size: 30px;
    padding: 17px;
    color: white;
    .topBox {
      display: flex;
      justify-content: space-between;
      .iconContainer {
        i {
          margin-right: 10px;
          font-size: 40px;
          cursor: pointer;
        }
      }
      .btnContainer {
        display: flex;
        justify-content: space-between;
        flex-wrap: nowrap;
        gap: 15px;
        .control {
          font-size: 15px;
          cursor: pointer;
          color: white;
          border-radius: 5px;
          background-color: #349bff;
          height: 35px;
          width: 75px;
        }
      }
      .speed {
        margin-left: 20px;
        font-size: 26px;
        span {
          margin-left: 10px;
          font-size: 14px;
        }
      }
    }
    .bottomBox {
      margin-top: 20px;
      .processBarO {
        width: 100%;
        border-radius: 20px;
        height: 15px;
        background-color: white;
        .processBarI {
          border-radius: 20px;
          height: 100%;
          background-color: #399aff;
          width: 0;
        }
      }
    }
  }
}

.move-enter-active,
.move-leave-active {
  transition: all 0.5s ease;
}
.move-enter-from,
.move-leave-to {
  transform: translate(100%, 0);
}
// .move-enter-to,
// .move-leave-from {
//   transform: translate(0, 0);
// }
</style>

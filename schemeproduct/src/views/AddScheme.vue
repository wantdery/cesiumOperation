<template>
  <div>
    <el-card class="programDiscussion">
      <template #header>
        <div class="card-header">
          <span>方案论证</span>
          <div class="progress">
            <span :class="isFirstStep ? 'active' : ''">地形平压</span>
            <!-- <i class="iconfont icon-youfang"></i> -->
            <el-icon><ArrowRightBold /></el-icon>
            <span :class="!isFirstStep ? 'active' : ''">模型放置</span>
          </div>
        </div>
      </template>
      <div class="firstStep" v-show="isFirstStep">
        <div class="function">
          <div class="drawFunction" @click="drawArea">
            <el-icon><Crop /></el-icon>&nbsp; <span>绘制区域</span>
          </div>
          <div
            class="heightFunction"
            v-show="cartographicArr.length ? true : false"
          >
            <span>高度调整：</span>
            <el-icon @click="increaseHeight"><Top /></el-icon>
            <el-icon @click="decreaseHeight"><Bottom /></el-icon>
          </div>
        </div>
        <table class="drawData" v-show="positions.length ? true : false">
          <tr>
            <td>区域坐标</td>
            <td><input type="text" v-model="positions" /></td>
          </tr>
          <tr>
            <td>平压高度</td>
            <td><input type="text" v-model.lazy="height" /></td>
          </tr>
        </table>
      </div>
      <div class="secondStep" v-show="!isFirstStep">
        <div class="drawFunction" @click="setModelPosition">
          <el-icon><OfficeBuilding /></el-icon>&nbsp; <span>模型位置</span>
        </div>
        <table class="modelPosition">
          <tr v-for="item in modelList" :key="item.id">
            <td>
              <span
                @click="selectModel(item)"
                :class="currentItem === item.id ? 'active' : ''"
                >{{ item.name }}</span
              >
            </td>
            <td><img :src="item.url" alt="" /></td>
          </tr>
        </table>
        <div class="modelAdjustment" v-show="isModelSet">
          <span>调整：</span>
          <div class="functionBtns">
            <el-icon @click="orientationMove('left')"><CaretLeft /></el-icon>
            <el-icon @click="orientationMove('right')"><CaretRight /></el-icon>
            <el-icon @click="orientationMove('front')"><CaretTop /></el-icon>
            <el-icon @click="orientationMove('back')"><CaretBottom /></el-icon>
            <el-icon
              v-longpress="() => changeOrientation('clockwise')"
              @click="changeOrientation('clockwise')"
              ><RefreshRight
            /></el-icon>
            <el-icon
              v-longpress="() => changeOrientation('counterclockwise')"
              @click="changeOrientation('counterclockwise')"
              ><RefreshLeft
            /></el-icon>
            <el-icon @click="changeScale('in')"><ZoomIn /></el-icon>
            <el-icon @click="changeScale('out')"><ZoomOut /></el-icon>
          </div>
        </div>
        <!-- isModelSet -->
      </div>
      <div class="functionButton">
        <el-button type="info" @click="nextStep">{{
          isFirstStep ? "下一步" : "上一步"
        }}</el-button>
        <el-button type="primary" v-show="isModelSet" @click="summitProdution"
          >提　交</el-button
        >
      </div>
    </el-card>

    <el-dialog
      v-model="centerDialogVisible"
      title="请输入方案名称"
      width="500"
      center
    >
      <el-input v-model.trim="projectName" />
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="addProduction">确定</el-button>
          <el-button @click="centerDialogVisible = false"> 取消 </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import { toDraw, endDraw } from "../tool/draw";
import { toFlatten, clearFlatten, changeHeight } from "../tool/flatten";
import { addScheme, getScheme, delScheme } from "../api/schemeApi";
import {
  ref,
  onMounted,
  getCurrentInstance,
  watch,
  onUnmounted,
  computed,
  unref,
} from "vue";
import { ElMessage } from "element-plus";

const { appContext } = getCurrentInstance();
const global = appContext.config.globalProperties;
const isFirstStep = ref(true);
const cartographicArr = ref([]);
const positions = ref([]);
let polygonCenter;
const centerDialogVisible = ref(false);
const projectName = ref("");
const modelList = ref([
  {
    name: "购物商城",
    url: "/src/assets/model/1.png",
    model: "/src/assets/model/1.gltf",
    id: 1,
  },
  {
    name: "L型办公楼",
    url: "/src/assets/model/2.png",
    model: "/src/assets/model/2.gltf",
    id: 2,
  },
  {
    name: "政务大楼",
    url: "/src/assets/model/3.png",
    model: "/src/assets/model/3.gltf",
    id: 3,
  },
  {
    name: "教学楼",
    url: "/src/assets/model/4.png",
    model: "/src/assets/model/4.gltf",
    id: 4,
  },
]);

onMounted(() => {
  // console.log(global.$viewer, "addScheme");
});

const nextStep = () => {
  isFirstStep.value = !isFirstStep.value;
  if (!cartographicArr.value.length) {
    return ElMessage.error("请绘制有效区域");
  }
  currentItem.value = 0;
  if (!isFirstStep.value && currentModel) {
    isModelSet.value = true;
  } else {
    isModelSet.value = false;
  }
  currentModel && global.$viewer.entities.remove(currentModel);
  currentModel = null;
};
let currentArea;
const drawArea = () => {
  // currentArea && global.$viewer.entities.remove(currentArea);
  global.$viewer.entities.removeAll();
  clearFlatten(global.$viewer.scene.primitives._primitives[0]);
  toDraw(global.$viewer, "polygon", handlerArea);
};
let cartographicPolygon;
const handlerArea = (data) => {
  data.polygon.material = Cesium.Color.fromCssColorString("#6e7f8f"); //#6e7f8f
  currentArea = data;
  height.value = 0;
  toFlatten(
    global.$viewer.scene.primitives._primitives[0],
    data.polygon.hierarchy._value.positions
  );
  positions.value = [];

  cartographicArr.value = data.polygon.hierarchy._value.positions.map(
    (item) => {
      const cartographic = Cesium.Cartographic.fromCartesian(item);
      let lon = Cesium.Math.toDegrees(cartographic.longitude);
      let lat = Cesium.Math.toDegrees(cartographic.latitude);
      return [lon, lat];
    }
  );
  cartographicArr.value.push(cartographicArr.value[0]);
  cartographicPolygon = turf.polygon([cartographicArr.value]);
  let pointGeoJSON = turf.centroid(cartographicPolygon);
  polygonCenter = pointGeoJSON.geometry.coordinates;

  positions.value = cartographicArr.value.flat(Infinity);
};
const height = ref(0);
const increaseHeight = () => {
  if (height.value >= 3) return ElMessage.error("最高高度为3");
  height.value += 0.1;
  height.value = Number(height.value.toFixed(1));
  if (!global.$viewer.scene.primitives._primitives[0]) return;
  changeHeight(
    global.$viewer.scene.primitives._primitives[0],
    Number(height.value.toFixed(1))
  );
};
const decreaseHeight = () => {
  if (height.value <= -3) return ElMessage.error("最低高度为-3");
  height.value -= 0.1;
  height.value = Number(height.value.toFixed(1));
  if (!global.$viewer.scene.primitives._primitives[0]) return;
  changeHeight(
    global.$viewer.scene.primitives._primitives[0],
    Number(height.value.toFixed(1))
  );
};
let modelUri;
let currentModel;
const currentItem = ref(0);
const isModelSet = ref(false);
const selectModel = (item) => {
  currentItem.value = item.id;
  modelUri = item.model;
};

const setModelPosition = () => {
  if (!modelUri) return ElMessage.error("请先选择模型！");
  ElMessage.info("请选择模型位置");
  currentModel && global.$viewer.entities.remove(currentModel);
  toDraw(global.$viewer, "point", handlerModelPosition);
};
const handlerModelPosition = (data) => {
  const cartographic = Cesium.Cartographic.fromCartesian(data._position._value);
  let lon = Cesium.Math.toDegrees(cartographic.longitude);
  let lat = Cesium.Math.toDegrees(cartographic.latitude);
  let pointHeight = cartographic.height;
  let point = turf.point([lon, lat]);
  let cartographicPolygon = turf.polygon([cartographicArr.value]);
  if (!turf.booleanContains(cartographicPolygon, point)) {
    global.$viewer.entities.remove(data);
    return ElMessage.error("模型位置不在区域内");
  }

  const orientation = Cesium.Transforms.headingPitchRollQuaternion(
    data._position._value,
    Cesium.HeadingPitchRoll.fromDegrees(0, 0, 0)
  );
  angle = 0;

  currentModel = global.$viewer.entities.add({
    position: data._position._value,
    orientation,
    model: {
      uri: modelUri,
      scale: 0.001,
      minimumPixelSize: 12,
    },
  });
  currentScale.value = currentModel.model.scale;

  isModelSet.value = true;
  global.$viewer.entities.remove(data);
  endDraw();
};

// const moveModel = (model, str) => {
//   const cartographic = Cesium.Cartographic.fromCartesian(
//     currentModel._position._value
//   );
//   let lon = Cesium.Math.toDegrees(cartographic.longitude);
//   let lat = Cesium.Math.toDegrees(cartographic.latitude);
//   let pointHeight = cartographic.height;
//   lon -= 0.00001;
//   const newCartesian = Cesium.Cartesian3.fromDegrees(lon, lat, pointHeight);
//   currentModel._position._value = newCartesian;
// };
let cartographic1;
const orientationMove = (orientation) => {
  //1.首先将模型坐标拿到然后先转成经纬度，只拿精度和纬度转新笛卡尔，保存高度
  cartographic1 = Cesium.Cartographic.fromCartesian(
    currentModel._position._value
  );
  let oldLon = Cesium.Math.toDegrees(cartographic1.longitude);
  let oldLat = Cesium.Math.toDegrees(cartographic1.latitude);
  let pointHeight = cartographic1.height;
  const Cartesian1 = Cesium.Cartesian3.fromDegrees(oldLon, oldLat);
  //2.新笛卡尔转成屏幕坐标，调整屏幕坐标，
  const windowPosition = new Cesium.Cartesian2();
  Cesium.SceneTransforms.wgs84ToWindowCoordinates(
    global.$viewer.scene,
    Cartesian1,
    windowPosition
  );

  let moveLength = 10;
  switch (orientation) {
    case "left":
      windowPosition.x -= moveLength;
      break;
    case "right":
      windowPosition.x += moveLength;
      break;
    case "front":
      windowPosition.y -= moveLength;
      break;
    case "back":
      windowPosition.y += moveLength;
      break;
  }
  //3.新的屏幕坐标转成第二新笛卡尔坐标
  const newCartesian = global.$viewer.scene.globe.pick(
    global.$viewer.camera.getPickRay(windowPosition),
    global.$viewer.scene
  );

  //4.第二新笛卡尔坐标转成经纬度，经纬度加原高度最后转回最终笛卡尔
  const cartographic = Cesium.Cartographic.fromCartesian(newCartesian);
  let newLon = Cesium.Math.toDegrees(cartographic.longitude);
  let newLat = Cesium.Math.toDegrees(cartographic.latitude);
  const finalCartesian = Cesium.Cartesian3.fromDegrees(
    newLon,
    newLat,
    pointHeight
  );
  //5.最终笛卡尔赋值给模型
  currentModel._position._value = finalCartesian;
};
let angle = 0;
const changeOrientation = (orientation) => {
  switch (orientation) {
    case "clockwise":
      angle++;
      break;
    case "counterclockwise":
      angle--;
      break;
  }
  const newHeadingPitchRoll = new Cesium.HeadingPitchRoll.fromDegrees(
    angle,
    0,
    0
  );
  const newQuaternion = Cesium.Transforms.headingPitchRollQuaternion(
    currentModel._position._value,
    newHeadingPitchRoll
  );
  currentModel.orientation = newQuaternion;
};
const currentScale = ref(0);
const changeScale = (scale) => {
  if (scale === "in") {
    currentModel.model.scale += 0.0001;
  } else if (scale === "out") {
    currentModel.model.scale -= 0.0001;
  }
  currentScale.value = currentModel.model.scale;
};
let parmas = {};
const summitProdution = () => {
  projectName.value = "";
  centerDialogVisible.value = true;
  if (!currentModel) return ElMessage.error("模型不存在！");
  const cartographic = Cesium.Cartographic.fromCartesian(
    currentModel._position._value
  );
  let oldLon = Cesium.Math.toDegrees(cartographic.longitude);
  let oldLat = Cesium.Math.toDegrees(cartographic.latitude);
  let pointHeight = cartographic.height;

  const cameraOrt =
    global.$viewer.camera.heading +
    "," +
    global.$viewer.camera.pitch +
    "," +
    global.$viewer.camera.roll;
  const cameraPosition =
    global.$viewer.camera.position.x +
    "," +
    global.$viewer.camera.position.y +
    "," +
    global.$viewer.camera.position.z;
  const heading = angle;
  const polygonJson = JSON.stringify(cartographicPolygon.geometry);
  const position = oldLon + "," + oldLat + "," + pointHeight;

  const src = `${currentItem.value}`;
  const tileHeight = height.value;
  const name = "";
  let scale;
  if (currentScale.value === 0) {
    scale = currentScale.value;
  } else {
    scale = currentScale.value._value;
  }
  parmas = {
    cameraOrt,
    cameraPosition,
    heading,
    position,
    polygonJson,
    scale,
    src,
    tileHeight,
    name,
  };
  console.log(parmas);
};

const addProduction = () => {
  if (projectName.value === "") return ElMessage.error("请输入方案名称！");
  height.value = 0;
  centerDialogVisible.value = false;
  global.$viewer.scene.primitives._primitives.forEach((item) => {
    clearFlatten(item);
  });
  parmas.name = projectName.value;
  addScheme(parmas);
  currentModel && global.$viewer.entities.remove(currentModel);
  currentModel = null;
  endDraw();
  parmas = null;
  currentScale.value = 0;
  angle = 0;
  cartographic1 = null;
  isModelSet.value = false;
  currentItem.value = 0;
  positions.value = [];
  cartographicPolygon = null;
  currentArea && global.$viewer.entities.remove(currentArea);
  currentArea = null;
  isFirstStep.value = true;
  projectName.value = "";
  cartographicArr.value = [];
};

onUnmounted(() => {
  height.value = 0;
  clearFlatten(global.$viewer.scene.primitives._primitives[0]);
  centerDialogVisible.value = false;
  currentModel && global.$viewer.entities.remove(currentModel);
  currentModel = null;
  endDraw();
  parmas = null;
  currentScale.value = 0;
  angle = 0;
  cartographic1 = null;
  isModelSet.value = false;
  currentItem.value = 0;
  positions.value = [];
  cartographicPolygon = null;
  currentArea && global.$viewer.entities.remove(currentArea);
  currentArea = null;
  isFirstStep.value = true;
  projectName.value = "";
  cartographicArr.value = [];
});

watch(
  height,
  (val) => {
    if (isNaN(Number(val))) return;
    if (!val) height.value = 0;
    if (val > 3) {
      ElMessage.error("最高高度为3");
      height.value = 3;
    } else if (val < -3) {
      ElMessage.error("最低高度为-3");
      height.value = -3;
    }
    let heightFixed = Number(height.value).toFixed(1);
    if(!global.$viewer.scene.primitives._primitives[0].customShader) return
    changeHeight(global.$viewer.scene.primitives._primitives[0], heightFixed);
  },
  {
    deep: true,
  }
);
</script>

<style lang="scss">
.programDiscussion {
  z-index: 999;
  width: 25%;
  position: absolute;
  top: 4%;
  left: 4%;
  .card-header {
    display: flex;
    justify-content: space-between;
    font-size: 23px;
    font-weight: bold;
    .progress {
      display: flex;
      align-content: center;
      line-height: 33px;
      .el-icon {
        font-size: 37px;
        color: #629496;
      }
      span {
        font-size: 19px;
        font-weight: 600;
      }
      span.active {
        color: #409eff;
      }
    }
  }
  .firstStep {
    // display: flex;
    padding: 10px 20px;
    font-size: 19px;
    font-weight: 600;
    // align-content: center;
    line-height: 30px;
    .function {
      display: flex;
      justify-content: space-between;
      .drawFunction {
        display: flex;
        align-content: center;
        line-height: 30px;
        .el-icon {
          font-size: 30px;
        }
        cursor: pointer;
      }
      .heightFunction {
        display: flex;
        align-content: center;
        gap: 10px;

        .el-icon {
          font-size: 30px;
          cursor: pointer;
          background-color: #555555;
          border-radius: 50%;
          color: white;
          font-weight: 500;
        }
      }
    }
    .drawData {
      width: 100%;
      //   padding: 0 25px;
      border-spacing: 10px;
      border-collapse: separate;
      margin-top: 20px;
      overflow: hidden;
      td:first-child {
        width: 150px;
      }
      td {
        color: #5d5d5d;
        position: relative;
        font-weight: 400;
        font-size: 15px;
        margin: 0 10px;
        border: 1px solid #e3e3e5;
        text-align: center;
        border-radius: 5px;
        height: 35px;
        input {
          text-align: center;
          line-height: 35px;
          color: #5d5d5d;
          font-size: 16px;
          padding: 10px 15px;
          width: 100%;
          height: 100%;
          border-radius: 5px;
          border: none;
        }
      }
    }
  }
  .secondStep {
    padding: 10px 20px;
    font-size: 19px;
    font-weight: 600;
    line-height: 30px;
    .drawFunction {
      display: flex;
      align-content: center;
      line-height: 30px;
      .el-icon {
        font-size: 30px;
      }
      cursor: pointer;
    }
  }
  .functionButton {
    margin-top: 15px;
    display: flex;
    justify-content: flex-end;
    padding: 0 30px;
  }
  .modelPosition {
    margin-top: 30px;
    width: 100%;
    margin-top: 20px;
    overflow: hidden;
    border-radius: 5px;
    border: 1px solid #e3e3e5;
    border-collapse: collapse;
    tr:last-child {
      border-bottom: 1px solid #e3e3e5;
    }
    tr {
      border: 1px solid #e3e3e5;
      border-bottom: none;
      height: 85px;
      display: flex;
      justify-content: space-between;
      align-content: center;
      line-height: 85px;
      padding: 0 65px;
      span {
        cursor: pointer;
      }
      img {
        height: 100%;
        width: 115px;
      }
      span.active {
        color: #409eff;
      }
    }
  }
  .modelAdjustment {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    padding: 0 5px;
    padding-right: 10px;
    .functionBtns {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      font-size: 32px;
      color: white;
      .el-icon {
        border-radius: 50%;
        background-color: #555555;
        cursor: pointer;
      }
    }
  }
}
.el-dialog {
  .el-dialog__body {
    display: flex;
    justify-content: center;
  }
  .el-input__wrappe {
    margin: 0 auto;
    justify-self: center;
  }
  .el-input {
    width: 60%;
  }
}
</style>

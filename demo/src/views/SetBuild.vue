<template>
  <el-card class="setbuild">
    <template #header>
      <div class="card-header">
        <span style="font-weight: 600; font-size: 18px">楼房分户</span>
        <el-icon @click="reFresh()"><Refresh /></el-icon>
      </div>
    </template>
    <div class="processBar">
      <el-steps
        style="max-width: 1000px,font-size: 22px"
        :space="1000"
        :active="active"
        finish-status="success"
        align-center
      >
        <el-step title="区域绘制" />
        <el-step title="户型切分" />
        <el-step title="楼房分层" />
      </el-steps>
    </div>
    <div class="container">
      <div style="margin: 40px 20px 10px 20px" class="functionBtn">
        绘制户型：
        <span v-show="active === 0 ? true : false" @click="areaDraw()">
          <el-icon><Location /></el-icon>绘制图形
        </span>
        <span v-show="active === 1 ? true : false" @click="cutDraw()">
          <el-icon><Scissor /></el-icon>裁剪图形
        </span>
        <span v-show="active >= 2 ? true : false" @click="curFloor()">
          <el-icon><Histogram /></el-icon>楼层分层
        </span>
      </div>
      <div
        v-show="(active >= 2 ? true : false) && isFloorShow"
        class="rightNum"
      >
        楼层数: <input type="number" v-model="floorNum" />
      </div>
    </div>
    <table>
      <tr>
        <th style="max-width: 150px">分户坐标</th>
        <th style="max-width: 150px">地址前缀</th>
        <th>单位</th>
        <th v-show="active === 1 ? true : false">定位</th>
      </tr>
      <tr v-for="item in buildingInfo" :key="item">
        <input type="text" disabled v-model="item.position" />
        <td><input type="text" v-model="item.name" /></td>
        <td>{{ item.floor }}</td>
        <span
          v-show="active === 1 ? true : false"
          @click="markUnit(item.floor)"
        >
          <el-icon><LocationFilled /></el-icon>
        </span>
      </tr>
    </table>
    <div
      class="pointHeight"
      v-show="(active >= 2 ? true : false) && isFloorShow"
    >
      <div>最低点：<input type="text" v-model="pointArray[0]" /></div>
      <div>分割点：<input type="text" v-model="pointArray[1]" /></div>
      <div>最高点：<input type="text" v-model="pointArray[2]" /></div>
    </div>
    <div class="nextBtn">
      <el-button
        type="info"
        style="margin-top: 12px"
        @click="nextStep"
        v-show="active < 2 ? true : false"
        >下一步</el-button
      >
      <el-button
        type="success"
        style="margin-top: 12px"
        @click="finishCut()"
        v-show="active >= 2 ? true : false"
        >楼房分层</el-button
      >
      <el-button
        type="primary"
        style="margin-top: 12px"
        @click="toAddHouse()"
        v-show="active === 3 ? true : false"
        >生成数据</el-button
      >
    </div>
  </el-card>
</template>
<script setup>
import { ref, onMounted, getCurrentInstance, onUnmounted } from "vue";
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import { toDraw, endDraw } from "../tool/draw";
import { addHouse } from "../api/houseApi";
import { useRouter } from "vue-router";
import polygonCut from "../tool/polygonCut";
const { appContext } = getCurrentInstance();
const global = appContext.config.globalProperties;
import { ElMessage } from "element-plus";
const buildingInfo = ref([]);
const active = ref(0);
const floorNum = ref(0);
let activePolygon;
let pointArray = ref([]);
let countPoints = 0;
const isFloorShow = ref(false);
let handler;
let newData;
let res1;
let originColor;
let idList = ref([]);
let firstFloor = ref(true);
let isFloorDone = ref(true);
let houseList = [];
let positionsList = [];
let polygonCollection;

onUnmounted(() => {
  reFresh();
});

const toAddHouse = () => {
  let polygonJson = JSON.stringify(newData.geometry);
  let polygonJsonArr = polygonCollection
    ? polygonCollection.features.map((item) => {
        return JSON.stringify(item.geometry);
      })
    : [];
  let unitArr = buildingInfo.value.map((item) => {
    return Number(item.floor);
  });
  let heightArr = pointArray.value.map((item) => {
    return Number(item);
  });
  addHouse({
    polygonJsonArr,
    polygonJson,
    unitArr,
    heightArr,
    name: buildingInfo.value[0].name,
    floorNum: Number(floorNum.value),
  }).then((res) => {
    if (res.code === 200) {
      ElMessage.success("提交成功");
      reFresh();
    }
  });
};

const reFresh = () => {
  endDraw();
  endDraw();
  if (houseList.length > 0) {
    houseList.forEach((item) => {
      global.$viewer.scene.primitives.remove(item);
    });
  }
  global.$viewer.entities.removeAll();
  buildingInfo.value = [];
  activePolygon = null;
  pointArray.value = [];
  active.value = 0;
  floorNum.value = 0;
  countPoints = 0;
  isFloorShow.value = false;
  isFloorDone.value = true;
  firstFloor.value = true;
  idList.value = [];
  handler = null;
  newData = null;
  res1 = null;
  originColor = null;
  houseList = [];
  positionsList = [];
};

const nextStep = () => {
  if (active.value === 0 && buildingInfo.value.length === 0) {
    return ElMessage.warning("请先绘制户型");
  } else if (active.value === 1 && buildingInfo.value.length < 2) {
    return ElMessage.warning("请先切割户型");
  }
  if (active.value++ > 2) active.value = 3;
};
onMounted(() => {});

const cesiumPolygonToGeoJSON = (polygonEntity) => {
  // 获取多边形的坐标点
  let car3_ps = polygonEntity.polygon.hierarchy._value.positions;
  let arr = [];
  for (let i = 0; i < car3_ps.length; i++) {
    let _cartographic = Cesium.Cartographic.fromCartesian(car3_ps[i]);
    let _lon = Cesium.Math.toDegrees(_cartographic.longitude);
    let _lat = Cesium.Math.toDegrees(_cartographic.latitude);
    arr.push([_lon, _lat]);
  }
  arr.push(arr[0]);
  let geojson;
  try {
    geojson = turf.polygon([arr]);
  } catch (error) {
    return;
  }
  if (geojson) {
    return geojson;
  }
};

const drawPolygon = (draw) => {
  activePolygon = draw;
  newData = cesiumPolygonToGeoJSON(activePolygon);
  if (!newData) {
    return ElMessage.error("请绘制至少三个点！");
  }
  res1 = draw.polygon._hierarchy._value.positions
    .map((item, index) => {
      return Object.values(item);
    })
    .flat(Infinity);
  buildingInfo.value.push({
    position: res1,
    name: "xx小区xx栋",
    floor: 1,
  });
};
const drawLine = (draw) => {
  // 获取多边形的坐标点
  let car3_ps = draw.polyline.positions._value;
  let arr = [];
  for (let i = 0; i < car3_ps.length; i++) {
    let _cartographic = Cesium.Cartographic.fromCartesian(car3_ps[i]);
    let _lon = Cesium.Math.toDegrees(_cartographic.longitude);
    let _lat = Cesium.Math.toDegrees(_cartographic.latitude);
    arr.push([_lon, _lat]);
  }
  global.$viewer.entities.removeAll();
  if (arr.length < 2) {
    global.$viewer.entities.add(activePolygon);
    return ElMessage.error("请绘制至少两个点！");
  }
  let line = turf.lineString(arr);
  // let res;
  try {
    polygonCollection = polygonCut(newData, line);
    if (polygonCollection.features.length < 2) {
      ElMessage.error("请分割区域");
      global.$viewer.entities.add(activePolygon);
      global.$viewer.entities.remove(draw);
      return;
    }
  } catch (error) {
    global.$viewer.entities.add(activePolygon);
    global.$viewer.entities.remove(draw);
    ElMessage.error(error);
    return;
  }
  Cesium.GeoJsonDataSource.load(polygonCollection, {
    clampToGround: true,
  }).then((info) => {
    info.entities.values.forEach((item, index) => {
      item.polygon.material = Cesium.Color.fromRandom({ alpha: 0.4 });
      global.$viewer.entities.add(item);
      buildingInfo.value.push({
        position:
          polygonCollection.features[index].geometry.coordinates.toString(),
        name: buildingInfo.value[0].name,
        floor: index + 1,
      });
    });
    buildingInfo.value.shift();
  });
};
const areaDraw = () => {
  global.$viewer.entities.removeAll();
  buildingInfo.value = [];
  ElMessage("请绘制图形，右键结束绘制");
  toDraw(global.$viewer, undefined, drawPolygon);
};
const cutDraw = () => {
  ElMessage("请绘制图形，右键结束绘制");
  buildingInfo.value = [
    {
      position: res1,
      name: buildingInfo.value[0].name,
      floor: 1,
    },
  ];
  global.$viewer.entities.removeAll();
  global.$viewer.entities.add(activePolygon);
  toDraw(global.$viewer, "line", drawLine);
};

const markUnit = (floor) => {
  let entity = global.$viewer.entities.values.find((item, index) => {
    if (index + 1 === floor) {
      return global.$viewer.entities.values[index];
    }
  });
  toFlash(entity);
};
const toFlash = (entity) => {
  if (entity.polygon.material.color._callback) return;
  let initColor = entity.polygon.material.color._value;
  let x = 1;
  let flog = true;
  entity.polygon.material = new Cesium.ColorMaterialProperty(
    new Cesium.CallbackProperty(() => {
      if (flog) {
        x = x - 0.05;
        if (x <= 0) {
          flog = false;
        }
      } else {
        x = x + 0.05;
        if (x >= 1) {
          flog = true;
        }
      }
      return Cesium.Color.RED.withAlpha(x);
    }, false)
  );
  setTimeout(() => {
    entity.polygon.material = initColor;
  }, 1500);
};

const drawPoint = (draw) => {
  let _cartographic = Cesium.Cartographic.fromCartesian(draw.position._value);
  if (pointArray.value.length >= 3) {
    ElMessage.error("请单击右键结束绘制，超出三个点为无效值！");
    global.$viewer.entities.remove(draw);
    return;
  }
  pointArray.value.push(_cartographic.height);
  pointArray.value.sort((a, b) => {
    return a - b;
  });
  if (handler) {
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }
  handler = new Cesium.ScreenSpaceEventHandler(global.$viewer.canvas);
  if (pointArray.value.length < 3) {
    handler.setInputAction((event) => {
      ElMessage.error("请绘制三个点！");
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    // handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK); //移除右键点击事件
    return;
  } else {
    handler.setInputAction((event) => {
      endDraw();
      ElMessage.success("绘制成功！");
      isFloorShow.value = true;
      handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK); //移除右键点击事件
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }
};

const curFloor = () => {
  ElMessage("请依次绘制底层、二楼、顶楼高度点！");
  pointArray.value = [];
  for (let i = global.$viewer.entities.values.length - 1; i >= 0; i--) {
    if (global.$viewer.entities.values[i].point) {
      global.$viewer.entities.remove(global.$viewer.entities.values[i]);
    }
  }
  toDraw(global.$viewer, "point", drawPoint);
};

const finishCut = () => {
  if (floorNum.value <= 0) {
    return ElMessage.error("楼层数量为无效值！");
  }
  if (houseList.length > 0) {
    houseList.forEach((item) => {
      global.$viewer.scene.primitives.remove(item);
    });
  }
  houseList = [];
  if (active.value === 2 && pointArray.value.length < 3) {
    return ElMessage.warning("请先进行楼层分层！");
  }
  if (active.value++ > 2) active.value = 3;
  for (let i = global.$viewer.entities.values.length - 1; i >= 0; i--) {
    if (global.$viewer.entities.values[i].point) {
      global.$viewer.entities.remove(global.$viewer.entities.values[i]);
    }
  }
  if (global.$viewer.entities.values.length > 0) {
    global.$viewer.entities.values.forEach((item) => {
      positionsList.push({
        positions: item.polygon.hierarchy._value.positions,
        id: item.id,
      });
    });
  }
  positionsList.forEach((item) => {
    idList.value.push(item.id);
    for (let i = 0; i < floorNum.value; i++) {
      if (i === 0) {
        let primitive = new Cesium.ClassificationPrimitive({
          geometryInstances: new Cesium.GeometryInstance({
            geometry: new Cesium.PolygonGeometry({
              polygonHierarchy: new Cesium.PolygonHierarchy(item.positions),
              height: +pointArray.value[0],
              extrudedHeight: +pointArray.value[1],
            }),
            attributes: {
              color: Cesium.ColorGeometryInstanceAttribute.fromColor(
                Cesium.Color.fromRandom({ alpha: 0.3 }) //颜色
              ),
            },
          }),
          classificationType: Cesium.ClassificationType.CESIUM_3D_TILE,
        });
        global.$viewer.scene.primitives.add(primitive);
        houseList.push(primitive);
        firstFloor.value = false;
      } else {
        let primitive = new Cesium.ClassificationPrimitive({
          geometryInstances: new Cesium.GeometryInstance({
            geometry: new Cesium.PolygonGeometry({
              polygonHierarchy: new Cesium.PolygonHierarchy(item.positions),
              height:
                +pointArray.value[1] +
                ((+pointArray.value[2] - pointArray.value[1]) /
                  (floorNum.value - 1)) *
                  (i - 1),
              extrudedHeight:
                +pointArray.value[1] +
                ((+pointArray.value[2] - pointArray.value[1]) /
                  (floorNum.value - 1)) *
                  i,
            }),
            attributes: {
              color: Cesium.ColorGeometryInstanceAttribute.fromColor(
                Cesium.Color.fromRandom({ alpha: 0.3 }) //颜色
              ),
            },
          }),
          classificationType: Cesium.ClassificationType.CESIUM_3D_TILE,
        });
        global.$viewer.scene.primitives.add(primitive);
        houseList.push(primitive);
      }
    }
  });

  idList.value.forEach((id) => {
    global.$viewer.entities.removeById(id);
  });
};
</script>
<style lang="scss">
.setbuild {
  width: 25%;
  position: absolute;
  top: 4%;
  left: 4%;
  z-index: 999;
  input {
    border-color: #e4e3e7;
  }
  .processBar {
    margin: 0 auto;
    height: 90px;
  }
  .container {
    font-size: 20px;
    display: flex;
    justify-content: space-between;
    .functionBtn {
      span {
        cursor: pointer;
      }
    }
    .rightNum {
      width: 250px;
      margin: 40px 35px 10px 0px;
      text-align: end;
      input {
        font-size: 16px;
        border-radius: 5px;
        height: 35px;
        width: 25%;
        padding-left: 10px;
      }
    }
  }
  .nextBtn {
    margin-top: 10px;
    display: flex;
    justify-content: end;
  }
  table {
    width: 100%;
    padding: 0 25px;
    border-spacing: 10px;
    border-collapse: separate;
    td,
    th {
      position: relative;
      font-weight: 400;
      margin: 0 10px;
      border: 1px solid #e3e3e5;
      text-align: center;
      border-radius: 5px;
    }
    tr {
      height: 35px;
      margin: 5px 0;
      span {
        display: inline-block;
        width: 100%;
        text-align: center;
        cursor: pointer;
      }
    }
    input {
      width: 100%;
      height: 35px;
      border-radius: 5px;
      text-align: center;
    }
  }
  .pointHeight {
    display: flex;
    justify-content: space-around;
    margin: 10px 20px;
    text-align: center;
    input {
      padding: 0 10px;
      font-size: 16px;
      border-radius: 5px;
      height: 35px;
      width: 50%;
    }
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    .el-icon {
      cursor: pointer;
    }
  }
  .buildnum {
    float: right;
    width: 34%;

    .el-input {
      width: 50%;
    }
  }
  .myIcon {
    cursor: pointer;
    svg {
      width: 20px;
      position: relative;
      top: 5px;
      margin-right: 3px;
    }
  }
  .textInput {
    display: flex;

    .el-input {
      margin: 5px 1%;

      .el-input__inner {
        text-align: center;
      }
    }
    img {
      margin: 10px 4.6%;
      width: 14%;
      height: 25px;
      cursor: pointer;
    }
  }
  .pointList {
    display: flex;
    font-size: 15px;
    margin: 20px 0;
    line-height: 30px;
    .el-input {
      width: 15%;
      margin-right: 4%;
    }
  }
}
</style>

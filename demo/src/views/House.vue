<template>
  <el-card class="house">
    <template #header>
      <div class="card-header">
        <span style="font-weight: 600; font-size: 26px">查看房户信息</span>
      </div>
      <el-select
        v-model="buildingSelect"
        placeholder="请选择楼栋"
        size="large"
        style="width: 240px"
      >
        <el-option
          v-for="(item, index) in bulidingList"
          :key="item.name + index"
          :value="item.name"
          @click="flyToBuilding(item.id)"
        />
      </el-select>
    </template>
  </el-card>
</template>
<script setup>
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import Bubble from "../tool/bubble";
import {
  ref,
  onMounted,
  getCurrentInstance,
  watch,
  unref,
  toRaw,
  onUnmounted,
} from "vue";
import { getBuild } from "../api/buildApi";
import { getHouse, getOneHouseInfo, updateInfo } from "../api/houseApi";
const { appContext } = getCurrentInstance();
const global = appContext.config.globalProperties;
const bulidingList = ref([]);
let chooseBuild;
let primitiveArr = [];

let handler;
let bubble, lastPick;
const buildingSelect = ref("");
const colors = [
  "#99CCCC",
  "#66FF66",
  "#FF6666",
  "#00CCFF",
  "#00FF33",
  "#CC0000",
  "#CC00CC",
  "#CCFF00",
  "#0000FF",
];
onUnmounted(() => {
  bubble && bubble.windowClose();
  if (primitiveArr.length > 0) {
    primitiveArr.forEach((item) => {
      global.$viewer.scene.primitives.remove(item);
    });
  }
  primitiveArr = [];
});
onMounted(async () => {
  const { data } = await getBuild();
  data.forEach((item) => {
    bulidingList.value.push(item);
  });
  initHandle();
});
const flyToBuilding = async (id) => {
  lastPick = null;
  bubble = null;
  chooseBuild = bulidingList.value.find((item) => {
    return (item.id = id);
  });
  if (primitiveArr.length > 0) {
    primitiveArr.forEach((item) => {
      global.$viewer.scene.primitives.remove(item);
    });
  }
  primitiveArr = [];
  let bulidPolygon = turf.polygon(chooseBuild.polygon.coordinates);
  let center = turf.centroid(bulidPolygon);
  center.geometry.coordinates.forEach((item) => {
    item = Number(item);
  });
  global.$viewer.camera.flyTo({
    destination: new Cesium.Cartesian3.fromDegrees(
      ...center.geometry.coordinates,
      230
    ), //相机坐标
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: Cesium.Math.toRadians(0),
    },
  });

  const { data } = await getHouse({ id: id, noPage: 1 });
  console.log(data);
  data.forEach((item) => {
    let primitive = new Cesium.ClassificationPrimitive({
      geometryInstances: new Cesium.GeometryInstance({
        id: item.id,
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(
              item.polygon.coordinates.flat(Infinity)
            )
          ),
          height: Number(item.minHeight),
          extrudedHeight: Number(item.maxHeight),
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString(colors[item.id % 9]).withAlpha(0.3) //颜色
          ),
        },
      }),
      classificationType: Cesium.ClassificationType.CESIUM_3D_TILE,
    });
    primitiveArr.push(primitive);
    global.$viewer.scene.primitives.add(primitive);
  });
};

const initHandle = () => {
  let handler = new Cesium.ScreenSpaceEventHandler(global.$viewer.scene.canvas);
  handler.setInputAction((e) => {
    let position = global.$viewer.scene.pickPosition(e.position);
    console.log(position)
    let pick = global.$viewer.scene.pick(e.position);
    if (position && pick && pick.id) {
      if (lastPick && lastPick.id !== pick.id) {
        const lastAttributes = lastPick.primitive.getGeometryInstanceAttributes(
          lastPick.id
        );
        lastAttributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(
          Cesium.Color.fromCssColorString(colors[lastPick.id % 9]).withAlpha(
            0.3
          )
        );
      }
      const attributes = pick.primitive.getGeometryInstanceAttributes(pick.id);
      attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(
        Cesium.Color.YELLOW.withAlpha(0.88)
      );
      lastPick = pick;
      getOneHouseInfo({ id: pick.id }).then((res) => {
        if (res.code === 200) {
          let houseInfo = res.data;
          bubble && bubble.windowClose();
          bubble = new Bubble({
            position,
            viewer: global.$viewer,
            houseInfo,
          });
        }
      });
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
};
</script>
<style lang="scss">
.house {
  width: 25%;
  position: absolute;
  top: 4%;
  left: 4%;
  z-index: 999;
  .el-card__header {
    display: flex;
    justify-content: space-between;
  }
}
</style>

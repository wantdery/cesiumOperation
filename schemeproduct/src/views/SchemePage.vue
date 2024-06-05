<template>
  <div>
    <el-card class="checkProgramme">
      <template #header>
        <div class="card-header">
          <span>查看方案</span>
        </div>
      </template>
      <table class="modelPosition">
        <tr v-for="(item, index) in programmeList" :key="index">
          <td>
            <span
              @click="checkTheProduction(item)"
              :class="currentItem === item.id ? 'active' : ''"
              >{{ item.name }}</span
            >
            <el-icon @click="delProgramme(item)"><Delete /></el-icon>
          </td>
        </tr>
      </table>
    </el-card>
  </div>
</template>

<script setup>
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import { toFlatten, clearFlatten, changeHeight } from "../tool/flatten";
import { addScheme, getScheme, delScheme } from "../api/schemeApi";
import {
  ref,
  onMounted,
  getCurrentInstance,
  watch,
  onUnmounted,
  computed,
} from "vue";
import { ElMessage } from "element-plus";

const { appContext } = getCurrentInstance();
const global = appContext.config.globalProperties;
const programmeList = ref([]);
const currentItem = ref(0);
let currentModel;
onMounted(async () => {
  // console.log(global.$viewer, "schemepage");

  const { data } = await getScheme();
  programmeList.value = data;
  console.log(data);
});

const checkTheProduction = (item) => {
  currentItem.value = item.id;
  clearFlatten(global.$viewer.scene.primitives._primitives[0]);
  global.$viewer.entities.removeAll();
  // currentModel && global.$viewer.entities.remove(currentModel);
  let cameraOrt = item.cameraOrt.split(",").map((a) => +a);
  let Cartesian = item.cameraPosition.split(",").map((b) => +b);
  let position = {
    x: Cartesian[0],
    y: Cartesian[1],
    z: Cartesian[2],
  };
  global.$viewer.camera.flyTo({
    destination: position,
    orientation: {
      heading: cameraOrt[0],
      pitch: cameraOrt[1],
      roll: cameraOrt[2],
    },
  });
  const polygonPositions = item.polygon.coordinates.flat(Infinity);

  const polygon = global.$viewer.entities.add({
    polygon: {
      hierarchy: {
        positions: Cesium.Cartesian3.fromDegreesArray(polygonPositions),
      },
      material: Cesium.Color.fromCssColorString("#6e7f8f"), //随机颜色   带透明度
      // height: item.tileHeight,
    },
  });
  toFlatten(
    global.$viewer.scene.primitives._primitives[0],
    polygon.polygon.hierarchy._value.positions
  );
  changeHeight(global.$viewer.scene.primitives._primitives[0], item.tileHeight);

  const newHeadingPitchRoll = new Cesium.HeadingPitchRoll.fromDegrees(
    item.heading,
    0,
    0
  );
  let modelPosition = item.position.split(",").map((a) => +a);
  const modelCartesian = Cesium.Cartesian3.fromDegrees(...modelPosition);
  const newQuaternion = Cesium.Transforms.headingPitchRollQuaternion(
    modelCartesian,
    newHeadingPitchRoll
  );
  currentModel = global.$viewer.entities.add({
    position: modelCartesian,
    orientation: newQuaternion,
    model: {
      uri: `/src/assets/model/${item.src}.gltf`,
      scale: item.scale,
      minimumPixelSize: 12,
    },
  });
};

const delProgramme = async (item) => {
  console.log(item);
  await delScheme({ id: item.id });
  ElMessage.success("删除成功，请重新选择模型！");
  currentItem.value = 0;
  clearFlatten(global.$viewer.scene.primitives._primitives[0]);
  global.$viewer.entities.removeAll();
  const { data } = await getScheme();
  programmeList.value = data;
};

onUnmounted(() => {
  currentItem.value = 0;
  clearFlatten(global.$viewer.scene.primitives._primitives[0]);
  global.$viewer.entities.removeAll();
});
</script>

<style lang="scss">
.checkProgramme {
  z-index: 999;
  width: 20%;
  position: absolute;
  top: 4%;
  left: 4%;
  .card-header {
    font-size: 24px;
    font-weight: 600;
  }
  .modelPosition {
    width: 100%;
    // margin-top: 20px;
    overflow: hidden;
    border-radius: 5px;
    // justify-content: space-between;
    border: 1px solid #e3e3e5;
    border-collapse: collapse;
    tr:last-child {
      border-bottom: 1px solid #e3e3e5;
    }
    tr {
      display: block;
      border: 1px solid #e3e3e5;
      border-bottom: none;
      // display: flex;
      height: 50px;
      padding: 0 25px;
      td {
        flex-wrap: wrap;
        height: 100%;
        // display: flex;
        // align-content: center;
        line-height: 35px;
        font-size: 19px;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-content: center;
        span {
          cursor: pointer;
        }
        span.active {
          color: #409eff;
        }
        .el-icon {
          cursor: pointer;
          line-height: 35px;
          align-self: center;
          justify-self: end;
          font-weight: 600;
          font-size: 25px;
        }
      }
    }
  }
}
</style>

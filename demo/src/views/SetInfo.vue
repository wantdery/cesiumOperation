<template>
  <el-card class="setinfo">
    <template #header>
      <div class="card-header">
        <span style="font-weight: 600; font-size: 26px">编辑房户信息</span>
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
    <el-table
      :data="houseHoldList"
      border
      style="width: 100%"
      ref="tableDom"
      empty-text="暂无数据"
      @row-click="checkHouseInfo"
    >
      <el-table-column prop="code" label="门牌号"
        ><template #default="scope">
          <el-tag type="primary" disable-transitions>{{
            scope.row.code
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="unit" label="单元号">
        <template #default="scope">
          <el-tag type="success" disable-transitions>{{
            scope.row.unit
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="floor" label="楼层">
        <template #default="scope">
          <el-tag type="info" disable-transitions>{{ scope.row.floor }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="control" label="操作">
        <template #default="scope">
          <el-button
            type="primary"
            link
            @click="updateHouseHoldInfo(scope.row, $event)"
          >
            编辑信息
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      layout="prev, pager, next"
      :total="150"
      :page-count="pageCount"
      @current-change="changePage"
    />
  </el-card>

  <el-dialog v-model="dialogVisible" title="编辑信息" width="750">
    <h2 style="text-align: center; margin-bottom: 15px">业主信息</h2>
    <div class="fromContainer">
      <el-form :inline="true" :model="houseHoldInfo" class="demo-form-inline">
        <el-form-item label="业主姓名">
          <el-input
            v-model="houseHoldInfo.ownerName"
            placeholder="请输入姓名"
          />
        </el-form-item>
        <el-form-item label="业主性别">
          <el-select v-model="houseHoldInfo.ownerSex" placeholder="请选择性别">
            <el-option label="男" value="1" />
            <el-option label="女" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="身份证号">
          <el-input
            v-model="houseHoldInfo.idCard"
            placeholder="请输入身份证号"
          />
        </el-form-item>
        <el-form-item label="手机号码">
          <el-input
            v-model="houseHoldInfo.phoneNum"
            placeholder="请输入手机号码"
          />
        </el-form-item>
        <el-form-item label="业主地址">
          <el-input
            v-model="houseHoldInfo.houseAddress"
            placeholder="请输入地址"
            style="width: 540px"
          />
        </el-form-item>
        <el-form-item label="业主头像">
          <img
            :src="
              houseHoldInfo.ownerImg
                ? `http://127.0.0.1:8090/${houseHoldInfo.ownerImg}`
                : ''
            "
            alt=""
            v-if="houseHoldInfo.ownerImg ? true : false"
            style="height: 40px; width: 40px; margin-right: 10px"
          />
          <el-upload
            action="http://127.0.0.1:8090/api/v1/upload"
            :multiple="false"
            accept="image/*,.png,.jpeg,.jpg,.gif,.bmp,.svg"
            :on-success="successOwner"
          >
            <el-button type="info">{{
              houseHoldInfo.ownerImg ? "重新上传" : "上传图像"
            }}</el-button>
          </el-upload>
        </el-form-item>
      </el-form>
    </div>
    <h2 style="text-align: center; margin-bottom: 15px">房屋信息</h2>
    <div class="fromContainer">
      <el-form :inline="true" :model="houseHoldInfo" class="demo-form-inline">
        <el-form-item label="房屋类型">
          <el-input
            v-model="houseHoldInfo.houseType"
            placeholder="请输入房屋类型"
          />
        </el-form-item>
        <el-form-item label="房屋面积">
          <el-input
            v-model="houseHoldInfo.builtArea"
            placeholder="请输入房屋面积"
            ><template #append>m²</template></el-input
          >
        </el-form-item>
        <el-form-item label="房屋朝向">
          <el-input
            v-model="houseHoldInfo.orientation"
            placeholder="请输入房屋朝向"
          />
        </el-form-item>
        <el-form-item label="物业类型">
          <el-select
            v-model="houseHoldInfo.propertyType"
            placeholder="请选择物业类型"
          >
            <el-option label="居民物业" value="1" />
            <el-option label="商业物业" value="2" />
            <el-option label="工业物业" value="3" />
            <el-option label="其他物业" value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="房屋号码">
          <el-input
            v-model="houseHoldInfo.nativePlace"
            style="width: 540px"
            disabled
          />
        </el-form-item>
        <el-form-item label="户型图">
          <img
            :src="
              houseHoldInfo.houseImg
                ? `http://127.0.0.1:8090/${houseHoldInfo.houseImg}`
                : ''
            "
            alt=""
            v-if="houseHoldInfo.houseImg ? true : false"
            style="height: 40px; width: 40px; margin-right: 10px"
          />
          <el-upload
            :on-success="successHouse"
            action="http://127.0.0.1:8090/api/v1/upload"
            :multiple="false"
            accept="image/*,.png,.jpeg,.jpg,.gif,.bmp,.svg"
          >
            <el-button type="info">{{
              houseHoldInfo.houseImg ? "重新上传" : "上传图像"
            }}</el-button>
          </el-upload>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="supportHouseInfo(houseHoldInfo)">
          提交
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
<script setup>
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import {
  ref,
  onMounted,
  getCurrentInstance,
  watch,
  unref,
  toRaw,
  onUnmounted,
} from "vue";
import { toDraw } from "../tool/draw";
import { getBuild } from "../api/buildApi";
import { genFileId } from "element-plus";
import { getHouse, getOneHouseInfo, updateInfo } from "../api/houseApi";
const { appContext } = getCurrentInstance();
const global = appContext.config.globalProperties;
const buildingSelect = ref("");
const bulidingList = ref([]);
const houseHoldList = ref([]);
const pageCount = ref(1);
const tableDom = ref(null);
const nowSelectid = ref(null);
const imgList = ref([]);
const houseHoldInfo = ref({});
const ownerImgRes = ref([]);
const houseImgRes = ref([]);
const ruleFormRef = ref(null);
let chooseBuild;
let primitiveArr = [];
const houseHoldGender = ref("");
const dialogVisible = ref(false);
onMounted(async () => {
  const { data } = await getBuild();
  data.forEach((item) => {
    bulidingList.value.push(item);
  });
});

onUnmounted(() => {
  if (primitiveArr.length > 0) {
    primitiveArr.forEach((item) => {
      global.$viewer.scene.primitives.remove(item);
    });
  }
  primitiveArr = [];
});
const supportHouseInfo = (info) => {
  dialogVisible.value = false;
  updateInfo(info);
};
const successOwner = (res) => {
  houseHoldInfo.value.ownerImg = res.data;
};
const successHouse = (res) => {
  houseHoldInfo.value.houseImg = res.data;
};

const updateHouseHoldInfo = async (row, e) => {
  const { data } = await getOneHouseInfo({
    id: row.id,
  });
  dialogVisible.value = true;
  houseHoldInfo.value = data;
  if (houseHoldInfo.value.houseImg) {
    houseImgRes.value = [];
    houseImgRes.value.push(houseHoldInfo.value.houseImg);
  }
  if (houseHoldInfo.value.ownerImg) {
    ownerImgRes.value = [];
    ownerImgRes.value.push(houseHoldInfo.value.ownerImg);
  }

  houseHoldInfo.value.nativePlace = `${row.unit}${row.code}`;
  e.stopPropagation();
};

const checkHouseInfo = async (row, column, event) => {
  if (primitiveArr.length > 0) {
    primitiveArr.forEach((item) => {
      global.$viewer.scene.primitives.remove(item);
    });
  }
  primitiveArr = [];
  let res = houseHoldList.value.find((item) => {
    return item.code === row.code;
  });
  let selectHouse = toRaw(res);
  let primitive = new Cesium.ClassificationPrimitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray(
            selectHouse.polygon.coordinates.flat(Infinity)
          )
        ),
        height: Number(selectHouse.minHeight),
        extrudedHeight: Number(selectHouse.maxHeight),
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          Cesium.Color.YELLOW.withAlpha(0.7) //颜色
        ),
      },
    }),
    classificationType: Cesium.ClassificationType.CESIUM_3D_TILE,
  });
  primitiveArr.push(primitive);
  global.$viewer.scene.primitives.add(primitive);
};

const changePage = async (page) => {
  let { data } = await getHouse({ id: chooseBuild.id, pageIndex: page });
  houseHoldList.value = data.list.map((item) => {
    return {
      id: item.id,
      minHeight: item.minHeight,
      maxHeight: item.maxHeight,
      code: `${item.floorNum}0${item.number}`,
      floor: `${item.floorNum}楼`,
      unit: `${item.number}单元`,
      polygon: item.polygon,
    };
  });
};

const flyToBuilding = async (id) => {
  chooseBuild = bulidingList.value.find((item) => {
    return (item.id = id);
  });
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
  let { data } = await getHouse({ id: chooseBuild.id, pageIndex: 1 });
  pageCount.value = Math.ceil(data.total / 10);
  houseHoldList.value = data.list.map((item) => {
    return {
      id: item.id,
      minHeight: item.minHeight,
      maxHeight: item.maxHeight,
      code: `${item.floorNum}0${item.number}`,
      floor: `${item.floorNum}楼`,
      unit: `${item.number}单元`,
      polygon: item.polygon,
    };
  });
};
</script>
<style lang="scss">
.setinfo {
  width: 25%;
  position: absolute;
  top: 4%;
  left: 4%;
  z-index: 999;
  .el-card__header {
    display: flex;
    justify-content: space-between;
  }
  .el-card__body {
    display: flex;
    flex-wrap: wrap;
    .el-table {
      td {
        text-align: center !important;
      }
      th {
        text-align: center !important;
      }
      tr {
        td:nth-child(4) {
          color: #409eff;
          span {
            cursor: pointer;
          }
        }
      }
    }
    .el-pagination {
      margin-top: 20px;
      margin-left: auto;
    }
  }
}
.fromContainer {
  padding: 10px 40px;
  display: flex;
  justify-content: space-between;
  .el-select {
    width: 219px;
  }
  .el-input {
    width: 219px;
  }
}
.el-upload-list {
  display: none !important;
}
</style>

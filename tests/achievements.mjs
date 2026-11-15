import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAchievementResponse,
  parseAchievementDetails,
  loadAchievements,
} from "../src/achievements.ts";

test("Steam GetMyAchievementsForApp counts real unlocked achievements",async()=>{
  const calls=[];
  const client={Apps:{GetMyAchievementsForApp:async id=>{
    calls.push(id);
    return {result:1,data:{rgAchievements:[
      {bAchieved:true,strID:"a"},{bAchieved:false,strID:"b"},
      {bAchieved:true,strID:"c"},{bAchieved:false,strID:"d"},
      {bAchieved:false,strID:"e"},
    ]}};
  }}};
  const value=await loadAchievements(367520,client);
  assert.deepEqual(value,{status:"ok",achieved:2,total:5,progress:40});
  assert.deepEqual(calls,["367520"]);
});

test("Steam app details fallback uses native nAchieved and nTotal",async()=>{
  const fallback={GetAppDetails:()=>({achievements:{nAchieved:28,nTotal:45}})};
  const client={Apps:{GetMyAchievementsForApp:async()=>({data:{rgAchievements:[]}})}};
  assert.deepEqual(await loadAchievements(480,client,fallback),
    {status:"ok",achieved:28,total:45,progress:62});
});

test("an empty game has no achievements, not a misleading 0/0 progress",async()=>{
  const result=await loadAchievements(480,
    {Apps:{GetMyAchievementsForApp:async()=>({data:{rgAchievements:[]}})}});
  assert.deepEqual(result,{status:"none",achieved:0,total:0,progress:0});
});

test("a missing or broken Steam API never invents achievement counts",async()=>{
  const result=await loadAchievements(480,
    {Apps:{GetMyAchievementsForApp:async()=>{throw Error("offline")}}});
  assert.deepEqual(result,{status:"unavailable",achieved:0,total:0,progress:0});
});

test("non-Steam shortcuts cannot query Steam achievement counts",async()=>{
  let calls=0;
  const client={Apps:{GetMyAchievementsForApp:async()=>{calls++;return {};}}};
  const value=await loadAchievements(3221225523,client);
  assert.equal(value.status,"unavailable");
  assert.equal(calls,0);
});

test("Steam AppDetails with invalid counters is ignored",()=>{
  assert.equal(parseAchievementDetails({achievements:{nAchieved:20,nTotal:10}}),null);
  assert.equal(parseAchievementDetails({achievements:{nAchieved:0,nTotal:NaN}}),null);
  assert.equal(parseAchievementResponse({data:{rgAchievements:"invalid"}}),null);
});

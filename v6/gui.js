(function(){
  const darkThemeCSS = `
    body { background-color: #121212 !important; color: #e0e0e0 !important; }
    div, pre, h2, ul, li { background-color: #1e1e1e !important; color: #e0e0e0 !important; }
    a { color: #64b5f6 !important; }
    * { border-color: #333 !important; }
    input, select { background: #121212; color: #e0e0e0; border: 1px solid #444; padding: 8px; }
    option { background: #1e1e1e; color: #e0e0e0; }
  `;
  const styleEl = document.createElement('style');
  styleEl.type = 'text/css';
  styleEl.appendChild(document.createTextNode(darkThemeCSS));
  document.head.appendChild(styleEl);
  
  function getCurrentTimezone(){
    const now = new Date(), pad = n => String(n).padStart(2,'0');
    const year = now.getFullYear(), month = pad(now.getMonth()+1), day = pad(now.getDate()),
          hours = pad(now.getHours()), minutes = pad(now.getMinutes()), seconds = pad(now.getSeconds()),
          offsetMinutes = now.getTimezoneOffset(), sign = offsetMinutes <= 0 ? '+' : '-', absOffset = Math.abs(offsetMinutes),
          offsetHours = pad(Math.floor(absOffset/60)), offsetMin = pad(absOffset%60);
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${sign}${offsetHours}${offsetMin}`;
  }
  const getLessonNumber = lesson => { if(lesson<1||lesson>16) throw new Error("error"); return lesson===1?"01":lesson<=9?"02":lesson<=14?"03":"04"; };
  const createRequestData = (unit, lesson, activity, fileName, score, time, studentId, maxScore) => ({
    data: JSON.stringify({ activityAttempts: [{ data: JSON.stringify({ order:1, maxScore, state:`<a>` }), unit:unit.toString().padStart(2,"0"), lesson, activity, fileName, time, activityType:"mc_questions_single_image", score, studentId }], order:1, maxScore, state:`<state></state>` }),
    unit: unit.toString().padStart(2,"0"), lesson, activity, fileName, time, activityType:"mc_questions_single_image", score, studentId
  });
  const sendRequest = (data, bookId) => {
    fetch(`https://q3e.oxfordonlinepractice.com/api/books/${bookId}/activities`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data) })
      .then(r => { if(!r.ok) throw new Error(`HTTPエラー:${r.status}`); return r.json(); })
      .then(d => console.log("成功:", d))
      .catch(e => console.error("エラー:", e))
  };
  function getAutoScore(jsonData, unitId, lessonId, activityId) {
    if(!jsonData || !jsonData.data || !jsonData.data.units) return null;
    for(const unit of jsonData.data.units)
      if(unit.unit === unitId)
        if(unit.lessons && Array.isArray(unit.lessons))
          for(const lesson of unit.lessons)
            if(lesson.lesson === lessonId)
              if(lesson.activities && Array.isArray(lesson.activities))
                for(const activity of lesson.activities)
                  if(activity.activity === activityId) return activity.maxScore;
    return null;
  }
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;overflow:auto";
  const modal = document.createElement("div");
  modal.style.cssText = "background:#1e1e1e;padding:20px;border-radius:8px;width:90%;max-width:500px;position:relative;box-sizing:border-box;max-height:90%;overflow-y:auto";
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = "position:absolute;top:10px;right:10px;border:none;background:transparent;font-size:24px;cursor:pointer;color:#e0e0e0";
  closeBtn.onclick = () => document.body.removeChild(overlay);
  modal.appendChild(closeBtn);
  const form = document.createElement("form");
  const createField = (id, labelText, type="text", def="") => {
    const c = document.createElement("div");
    c.style.marginBottom = "10px";
    const l = document.createElement("label");
    l.htmlFor = id; l.textContent = labelText; l.style.cssText="display:block;margin-bottom:5px;color:#e0e0e0";
    const i = document.createElement("input");
    i.type = type; i.id = id; i.name = id; i.value = def; i.style.cssText = "width:100%;padding:8px;box-sizing:border-box";
    c.appendChild(l); c.appendChild(i); return c;
  };
  const storedStudentId = localStorage.getItem("studentId") || "2751883",
        storedBookId = localStorage.getItem("bookId") || "129",
        storedClassId = localStorage.getItem("classId") || "379216";
  form.appendChild(createField("studentId", "studentId (default:2751883)", "text", storedStudentId));
  form.appendChild(createField("bookId", "bookId (default:129)", "text", storedBookId));
  form.appendChild(createField("classId", "classId (default:379216)", "text", storedClassId));
  form.appendChild(createField("unit", "ユニット番号 (例:4)", "number", ""));
  const markDiv = document.createElement("div");
  markDiv.style.marginBottom = "10px";
  const markLabel = document.createElement("label");
  markLabel.htmlFor = "markAllLessons"; markLabel.textContent = "このユニットすべてをマークしますか？"; markLabel.style.cssText="display:block;margin-bottom:5px;color:#e0e0e0";
  markDiv.appendChild(markLabel);
  const markSelect = document.createElement("select");
  markSelect.id = "markAllLessons"; markSelect.name = "markAllLessons";
  ["y","n"].forEach(v=> { const op = document.createElement("option"); op.value = v; op.textContent = v; markSelect.appendChild(op); });
  markSelect.value = "n"; markDiv.appendChild(markSelect); form.appendChild(markDiv);
  const autoScoreDiv = document.createElement("div");
  autoScoreDiv.style.marginBottom = "10px";
  const autoScoreLabel = document.createElement("label");
  autoScoreLabel.htmlFor = "autoScore"; autoScoreLabel.textContent = "自動で点数を決めますか？"; autoScoreLabel.style.cssText="display:block;margin-bottom:5px;color:#e0e0e0";
  autoScoreDiv.appendChild(autoScoreLabel);
  const autoScoreSelect = document.createElement("select");
  autoScoreSelect.id = "autoScore"; autoScoreSelect.name = "autoScore";
  ["y","n"].forEach(v=> { const op = document.createElement("option"); op.value = v; op.textContent = v; autoScoreSelect.appendChild(op); });
  autoScoreSelect.value = "n"; autoScoreDiv.appendChild(autoScoreSelect); form.appendChild(autoScoreDiv);
  const scoreDiv = createField("score", "スコア (例:8)", "number", "8"); form.appendChild(scoreDiv);
  autoScoreSelect.onchange = e => scoreDiv.style.display = e.target.value==="y"?"none":"block";
  form.appendChild(createField("time", "経過時間 (秒) (例:45)", "number", "45"));
  const lessonDiv = createField("lessonNumber", "レッスン番号 (例:5)", "number", ""); lessonDiv.style.display = markSelect.value==="n"?"block":"none"; form.appendChild(lessonDiv);
  markSelect.onchange = e => lessonDiv.style.display = e.target.value==="n"?"block":"none";
  const submitBtn = document.createElement("button");
  submitBtn.type = "submit"; submitBtn.textContent = "送信"; submitBtn.style.cssText = "padding:10px 20px;font-size:16px;cursor:pointer;background:#333;color:#e0e0e0;border:none";
  form.appendChild(submitBtn);
  const copyright = document.createElement("div");
  copyright.style.cssText = "text-align:center;margin-top:15px;font-size:12px;color:#888";
  copyright.textContent = "© Psannetwork";
  modal.appendChild(form); modal.appendChild(copyright);
  overlay.appendChild(modal); document.body.appendChild(overlay);
  form.onsubmit = async e => {
    e.preventDefault();
    const studentId = (document.getElementById("studentId").value.trim() || "2751883"),
          bookId = (document.getElementById("bookId").value.trim() || "129"),
          classId = (document.getElementById("classId").value.trim() || "379216"),
          unitStr = document.getElementById("unit").value.trim(),
          markAll = markSelect.value.toLowerCase(),
          autoScore = autoScoreSelect.value.toLowerCase(),
          scoreInput = document.getElementById("score").value.trim(),
          timeStr = document.getElementById("time").value.trim();
    let lessonStr = document.getElementById("lessonNumber").value.trim();
    if(!unitStr || isNaN(parseInt(unitStr,10))){ alert("有効なユニット番号を入力"); return }
    if(!timeStr || isNaN(parseInt(timeStr,10)) || parseInt(timeStr,10)<=0){ alert("有効な経過時間を入力"); return }
    if(markAll==="n"){ if(!lessonStr || isNaN(parseInt(lessonStr,10))){ alert("有効なレッスン番号を入力"); return }
      const ln = parseInt(lessonStr,10); if(ln < 1 || ln > 16){ alert("レッスン番号は1～16"); return }
    }
    localStorage.setItem("studentId", studentId);
    localStorage.setItem("bookId", bookId);
    localStorage.setItem("classId", classId);
    const unit = parseInt(unitStr,10), timeVal = parseInt(timeStr,10);
    let jsonData = null;
    if(autoScore==="y"){
      const apiUrl = `https://q3e.oxfordonlinepractice.com/api/books/${bookId}/activities?classId=${classId}`;
      try{
        const response = await fetch(apiUrl, { method:'GET', headers:{ 'Content-Type':'application/json', 'timezone': getCurrentTimezone() } });
        if(!response.ok) throw new Error(response.status);
        jsonData = await response.json();
      }catch(error){ alert("JSON取得失敗"); return }
    }
    if(markAll==="y"){
      for(let i = 1; i <= 16; i++){
        const lesson = getLessonNumber(i), activity = i.toString().padStart(2,"0"),
              fileName = `iQ3e_RW1_${unit.toString().padStart(2,"0")}_${lesson}_${activity}`;
        let score = autoScore==="y" ? getAutoScore(jsonData, unit.toString().padStart(2,"0"), lesson, activity) : parseInt(scoreInput,10);
        if(score === null){ alert(`Unit:${unit.toString().padStart(2,"0")}, Lesson:${lesson}, Activity:${activity} のスコアが取得できません`); return }
        const reqData = createRequestData(unit, lesson, activity, fileName, score, timeVal, studentId, score);
        sendRequest(reqData, bookId);
      }
    } else {
      const ln = parseInt(lessonStr,10), lesson = getLessonNumber(ln), activity = ln.toString().padStart(2,"0"),
            fileName = `iQ3e_RW1_${unit.toString().padStart(2,"0")}_${lesson}_${activity}`;
      let score = autoScore==="y" ? getAutoScore(jsonData, unit.toString().padStart(2,"0"), lesson, activity) : parseInt(scoreInput,10);
      if(score === null){ alert(`Unit:${unit.toString().padStart(2,"0")}, Lesson:${lesson}, Activity:${activity} のスコアが取得できません`); return }
      const reqData = createRequestData(unit, lesson, activity, fileName, score, timeVal, studentId, score);
      sendRequest(reqData, bookId);
    }
    alert("リクエスト送信済"); window.location.reload();
  }
})();

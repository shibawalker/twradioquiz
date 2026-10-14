export const GRADES = [
  {id:'3', name:'三等', tagline:'大家都可以考！', file:'questions-3.json'},
  {id:'2', name:'二等', tagline:'考過三等就可以！', file:'questions.json'},
  {id:'1', name:'一等', tagline:'設二等臺一年來進階！', file:'questions-1.json'},
];
export const selectedGrade = GRADES.find(g => g.id === new URLSearchParams(location.search).get('grade')) || GRADES[1];

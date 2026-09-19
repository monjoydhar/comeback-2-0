export type TaskStatus = "completed" | "partial" | "missed" | "planned_rest" | "not_applicable";
export type DayType = "Training Day" | "Rest Day" | "Full Rest Day";
export type TaskType = "sleep" | "diet" | "water" | "walking" | "workout" | "coding1" | "coding2";
export type Task = { id:TaskType; label:string; icon:string; status:TaskStatus; value?:string; target?:string; note?:string; };

import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { AwaitedReport } from "./types";

const styles = StyleSheet.create({ page:{padding:42,fontFamily:"Helvetica",fontSize:10,color:"#222"}, eyebrow:{fontSize:9,letterSpacing:2,color:"#8B6B45"}, title:{fontSize:24,marginTop:12}, muted:{color:"#666",lineHeight:1.5}, grid:{display:"flex",flexDirection:"row",gap:8,marginTop:20}, card:{flex:1,border:"1 solid #ddd",padding:10,borderRadius:5}, label:{fontSize:8,color:"#777",textTransform:"uppercase"}, value:{fontSize:16,marginTop:5}, section:{marginTop:24}, row:{display:"flex",flexDirection:"row",paddingVertical:5,borderBottom:"1 solid #eee"}, cell:{flex:1}, small:{fontSize:8,color:"#777"} });

export async function renderThirtyDayPdf(report: AwaitedReport) {
  const doc = <Document title="Comeback 2.0 — 30 Day Progress Report"><Page size="A4" style={styles.page}>
    <Text style={styles.eyebrow}>COMEBACK 2.0</Text><Text style={styles.title}>30-Day Progress Report</Text>
    <Text style={[styles.muted,{marginTop:8}]}>{report.user.name} · {report.periodStart} to {report.periodEnd}</Text>
    <View style={styles.grid}>
      <View style={styles.card}><Text style={styles.label}>Average completion</Text><Text style={styles.value}>{Math.round(report.averageCompletion)}%</Text></View>
      <View style={styles.card}><Text style={styles.label}>Net tokens</Text><Text style={styles.value}>{report.summary.netTokens}</Text></View>
      <View style={styles.card}><Text style={styles.label}>Current streak</Text><Text style={styles.value}>{report.streak}</Text></View>
    </View>
    <View style={styles.grid}>
      <View style={styles.card}><Text style={styles.label}>Completed days</Text><Text style={styles.value}>{report.completedDays}</Text></View>
      <View style={styles.card}><Text style={styles.label}>Partial days</Text><Text style={styles.value}>{report.partialDays}</Text></View>
      <View style={styles.card}><Text style={styles.label}>Missed days</Text><Text style={styles.value}>{report.missedDays}</Text></View>
    </View>
    <View style={styles.section}><Text style={{fontSize:14,marginBottom:8}}>Daily history</Text>{report.history.slice().reverse().map(row=><View key={row.date} style={styles.row}><Text style={styles.cell}>{row.date}</Text><Text style={styles.cell}>{Math.round(row.completionPercent)}%</Text><Text style={styles.cell}>{row.dayType.replace("_"," ")}</Text><Text style={styles.cell}>{row.completedTasks} complete</Text></View>)}</View>
    <View style={styles.section}><Text style={{fontSize:14,marginBottom:8}}>Token summary</Text><Text style={styles.muted}>Rewards earned: {report.rewards} · Penalties applied: {Math.abs(report.penalties)}</Text></View>
    <Text style={[styles.small,{marginTop:28}]}>Generated from recorded Comeback 2.0 account data. This report is a personal progress record and is not medical, academic, or professional certification.</Text>
  </Page></Document>;
  return renderToBuffer(doc);
}

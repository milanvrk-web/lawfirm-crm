import mysql from 'mysql2/promise';
import fs from 'node:fs/promises';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.query(`
  SELECT
    l.id AS leadId,
    TRIM(l.name) AS name,
    l.lostReason,
    l.lostReasonDetail,
    l.lostNote,
    f.id AS followUpId,
    f.title AS followUpTitle,
    f.dueDate,
    f.status AS followUpStatus,
    c.id AS commentId,
    c.text AS commentText,
    c.timestamp AS commentTimestamp,
    c.createdAt AS commentCreatedAt
  FROM leads l
  LEFT JOIN follow_ups f ON f.leadId = l.id
  LEFT JOIN follow_up_comments c ON c.followUpId = f.id
  WHERE l.stage = 'Lost'
  ORDER BY TRIM(l.name), c.createdAt, c.id
`);
await connection.end();
await fs.writeFile('/tmp/lost_lead_comment_audit.json', JSON.stringify(rows, null, 2));
const leads = new Map();
for (const row of rows) {
  if (!leads.has(row.leadId)) leads.set(row.leadId, { leadId: row.leadId, name: row.name, lostReason: row.lostReason, lostReasonDetail: row.lostReasonDetail, lostNote: row.lostNote, comments: [] });
  if (row.commentId && row.commentText) leads.get(row.leadId).comments.push({ commentId: row.commentId, text: row.commentText, timestamp: row.commentTimestamp, createdAt: row.commentCreatedAt, followUpTitle: row.followUpTitle, followUpStatus: row.followUpStatus });
}
const summary = [...leads.values()].map(lead => ({ ...lead, commentCount: lead.comments.length }));
await fs.writeFile('/tmp/lost_lead_comment_audit_grouped.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ rowCount: rows.length, lostLeadCount: summary.length, withComments: summary.filter(x => x.commentCount > 0).length, withoutComments: summary.filter(x => x.commentCount === 0).length, missingReason: summary.filter(x => !x.lostReason?.trim()).length }, null, 2));

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { canEditProject, emptyProject, isProjectList, isProjectRecord, projectReady } from '../../lib/core-api/member-projects'

const id = 'c85392f4-dccb-4bb9-96b7-4ee56d039b6a'
const record = () => ({
  id,
  content: emptyProject(),
  revision: 4,
  status: 'draft' as const,
  publishedRevision: null,
  authorName: 'Project author',
  isAuthor: true,
  updatedAt: '2026-10-21T10:00:00Z',
  media: [],
  publishedMediaIds: [],
  history: [],
  historyTotal: 0,
})

describe('private project workflow boundaries', () => {
  it('allows own drafts and decisions to be revised, while locking submitted and under-review work', () => {
    for (const status of ['draft', 'changes_requested', 'rejected'] as const) assert.equal(canEditProject({ ...record(), status }), true)
    for (const status of ['submitted', 'under_review', 'approved'] as const) assert.equal(canEditProject({ ...record(), status }), false)
    assert.equal(canEditProject({ ...record(), isAuthor: false }), false)
  })
  it('allows edits to the currently published revision without unlocking an unpublished approval', () => {
    assert.equal(canEditProject({ ...record(), status: 'approved', publishedRevision: 4 }), true)
    assert.equal(canEditProject({ ...record(), status: 'approved', publishedRevision: 3 }), false)
    assert.equal(canEditProject({ ...record(), status: 'approved', publishedRevision: null }), false)
  })
  it('accepts complete Arabic or English content and rejects blank or structurally invalid submissions', () => {
    assert.equal(projectReady(emptyProject()), false)
    for (const language of ['en', 'ar'] as const) {
      const content = emptyProject()
      for (const field of [content.title, content.summary, content.problem, content.solution, content.technicalApproach.overview])
        field[language] = language === 'ar' ? 'مشروع هندسي' : 'Engineering project'
      assert.equal(projectReady(content), true)
      content.title[language] = ' \t\n '
      assert.equal(projectReady(content), false)
    }
    const content = emptyProject()
    content.links = [{ label: { en: 'Source', ar: 'المصدر' }, href: 'javascript:alert(1)' }]
    assert.equal(projectReady(content), false)
  })
  it('requires valid revisions, bounded private media and known review statuses before rendering', () => {
    assert.equal(isProjectRecord(record()), true)
    assert.equal(isProjectRecord({ ...record(), revision: 0 }), false)
    assert.equal(isProjectRecord({ ...record(), status: 'pending_review' }), false)
    assert.equal(isProjectRecord({ ...record(), status: 'under_review' }), true)
    assert.equal(isProjectRecord({ ...record(), publishedRevision: 5 }), false)
    assert.equal(isProjectRecord({ ...record(), media: [{ id: 'bucket/object-key.png' }] }), false)
    assert.equal(isProjectRecord({ ...record(), media: Array.from({ length: 13 }, () => ({ id })) }), false)
  })
  it('validates a bounded history and leaves feedback as plain text', () => {
    const value = {
      ...record(),
      history: [{ id, revision: 3, action: 'changes_requested', feedback: '<script>plain feedback</script> ملاحظات', occurredAt: '2026-10-20T12:00:00Z' }],
      historyTotal: 105,
    }
    assert.equal(isProjectRecord(value), true)
    assert.equal(isProjectRecord({ ...value, historyTotal: 0 }), false)
    assert.equal(isProjectRecord({ ...value, history: [{ ...value.history[0], occurredAt: 'invalid' }] }), false)
  })
  it('rejects partial and malformed list responses instead of inventing drafts', () => {
    assert.equal(isProjectList({ code: 'SUCCESS', projects: [record()], total: 1 }), true)
    assert.equal(isProjectList({ code: 'SUCCESS', projects: [record()], total: 0 }), false)
    assert.equal(isProjectList({ code: 'SUCCESS', projects: [], total: '0' }), false)
    assert.equal(isProjectList({ code: 'SUCCESS', projects: Array.from({ length: 31 }, record), total: 31 }), false)
    assert.equal(isProjectList({ code: 'UNAVAILABLE', projects: [], total: 0 }), false)
  })
})

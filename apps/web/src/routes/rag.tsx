import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAction } from 'convex/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@my-better-t-app/backend/convex/_generated/api'

type UploadStatus =
  | { state: 'idle' }
  | { state: 'success'; message: string }
  | { state: 'error'; message: string }

export const Route = createFileRoute('/rag')({
  component: RagPage,
})

function RagPage() {
  const addMarkdown = useAction(api.example.add)
  const askQuestion = useAction(api.example.askQuestion)

  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [markdownText, setMarkdownText] = useState('')
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    state: 'idle',
  })
  const [isUploading, setIsUploading] = useState(false)

  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [contextJson, setContextJson] = useState<string | null>(null)

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) {
      setSelectedFileName(null)
      setMarkdownText('')
      return
    }

    try {
      const text = await file.text()
      setSelectedFileName(file.name)
      setMarkdownText(text)
      setUploadStatus({ state: 'idle' })
    } catch (error) {
      console.error('Failed to read file', error)
      setUploadStatus({
        state: 'error',
        message: 'Failed to read file. Please try another file.',
      })
    }
  }

  const handleUpload = async () => {
    if (!markdownText.trim()) {
      setUploadStatus({
        state: 'error',
        message: 'No Markdown content to upload.',
      })
      return
    }

    setIsUploading(true)
    setUploadStatus({ state: 'idle' })
    try {
      await addMarkdown({ text: markdownText })
      setUploadStatus({
        state: 'success',
        message: selectedFileName
          ? `Uploaded ${selectedFileName} into the knowledge base.`
          : 'Uploaded Markdown text into the knowledge base.',
      })
    } catch (error) {
      console.error('Failed to upload Markdown', error)
      setUploadStatus({
        state: 'error',
        message: 'Upload failed. Check the console for details.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleAsk = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!question.trim()) {
      return
    }

    setIsAsking(true)
    setAnswer(null)
    setContextJson(null)
    try {
      const response = await askQuestion({ prompt: question })
      setAnswer(response?.answer ?? 'No answer returned.')
      setContextJson(
        response?.context ? JSON.stringify(response.context, null, 2) : null
      )
    } catch (error) {
      console.error('Failed to ask question', error)
      setAnswer('Failed to fetch answer. Check the console for details.')
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6">
      <section className="space-y-4 rounded-lg border p-6 shadow-sm">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Markdown Knowledge Upload</h1>
          <p className="text-sm text-muted-foreground">
            Load a Markdown file into the shared global namespace.
          </p>
        </header>

        <div className="space-y-3">
          <Input
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileChange}
          />
          {selectedFileName && (
            <p className="text-sm text-muted-foreground">
              Selected file:{' '}
              <span className="font-medium">{selectedFileName}</span>
            </p>
          )}
          <textarea
            className="min-h-[200px] w-full rounded-md border border-input bg-background p-3 font-mono text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            value={markdownText}
            onChange={(event) => setMarkdownText(event.target.value)}
            placeholder="Markdown preview (editable before upload)..."
          />
          <div className="flex items-center gap-3">
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload to RAG'}
            </Button>
            {uploadStatus.state === 'success' && (
              <span className="text-sm text-green-600">
                {uploadStatus.message}
              </span>
            )}
            {uploadStatus.state === 'error' && (
              <span className="text-sm text-red-600">
                {uploadStatus.message}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold">Ask a Question</h2>
          <p className="text-sm text-muted-foreground">
            Query the global namespace using the configured RAG pipeline.
          </p>
        </header>

        <form className="space-y-3" onSubmit={handleAsk}>
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask something about the uploaded Markdown..."
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isAsking}>
              {isAsking ? 'Asking...' : 'Get Answer'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setQuestion('')
                setAnswer(null)
                setContextJson(null)
              }}
            >
              Clear
            </Button>
          </div>
        </form>

        {answer && (
          <div className="rounded-md border border-dashed p-4">
            <h3 className="mb-2 text-lg font-medium">Answer</h3>
            <p className="whitespace-pre-wrap text-sm">{answer}</p>
          </div>
        )}

        {contextJson && (
          <div className="rounded-md border border-dashed p-4">
            <h3 className="mb-2 text-lg font-medium">Context</h3>
            <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap text-xs">
              {contextJson}
            </pre>
          </div>
        )}
      </section>
    </div>
  )
}

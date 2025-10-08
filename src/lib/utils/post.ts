export function truncateLexicalJson(editorJson: any, limit = 200) {
  const root = editorJson.root
  let count = 0
  let done = false

  function walkNodes(nodes: any[]) {
    const out: any[] = []
    for (const node of nodes) {
      if (done) break

      if (node.type === "paragraph" && node.children) {
        const newParagraph = { ...node, children: walkNodes(node.children) }
        out.push(newParagraph)
      } else if (node.type === "text") {
        if (count + node.text.length <= limit) {
          count += node.text.length
          out.push(node)
        } else {
          const remaining = limit - count
          if (remaining > 0) {
            out.push({ ...node, text: node.text.slice(0, remaining) + "…" })
          }
          done = true
        }
      }
    }
    return out
  }

  return {
    ...editorJson,
    root: {
      ...root,
      children: walkNodes(root.children),
    },
  }
}

export function countLexicalCharacters(editorJson: any): number {
  let count = 0

  function walkNodes(nodes: any[]) {
    for (const node of nodes) {
      if (node.type === "paragraph" && node.children) {
        walkNodes(node.children)
      } else if (node.type === "text" && typeof node.text === "string") {
        count += node.text.length
      }
    }
  }

  if (editorJson?.root?.children) {
    walkNodes(editorJson.root.children)
  }

  return count
}

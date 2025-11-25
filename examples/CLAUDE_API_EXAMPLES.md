# Claude API Request Examples

These are representative examples of requests sent to Anthropic’s Claude Messages API. They are not logs; keys are masked and payloads are illustrative but realistic.

## cURL: Simple Text Prompt
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20240620",
    "max_tokens": 512,
    "system": "You are a concise data viz assistant.",
    "messages": [
      {"role": "user", "content": [
        {"type": "text", "text": "Summarize top donor and recipient countries by total commitments (USD)."}
      ]}
    ]
  }'
```

## Python (requests): With Parameters
```python
import os, requests
url = "https://api.anthropic.com/v1/messages"
headers = {
    "x-api-key": os.environ["ANTHROPIC_API_KEY"],
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
}
payload = {
    "model": "claude-3-haiku-20240307",
    "max_tokens": 300,
    "temperature": 0.2,
    "system": "You are a helpful geospatial analyst.",
    "messages": [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": (
                    "Given a CSV schema: year, donor, recipient, amount_usd, purpose_name. "
                    "Suggest three geo visualizations to compare donors vs recipients and top purposes."
                )}
            ],
        }
    ],
}
r = requests.post(url, headers=headers, json=payload, timeout=60)
r.raise_for_status()
print(r.json())
```

## Streaming (cURL)
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20240620",
    "max_tokens": 1024,
    "stream": true,
    "messages": [{"role": "user", "content": [{"type": "text", "text": "Propose a choropleth legend centered at zero for net balance."}]}]
  }'
```

## Tool Use (minimal structure)
If you enable tools, include a beta header and a `tools` array, then return tool results via `tool_result` messages.
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: tools-2024-04-04" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20240620",
    "max_tokens": 512,
    "tools": [
      {"name": "get_top_purposes", "description": "Return top purposes by count.", "input_schema": {"type": "object", "properties": {"n": {"type": "integer"}}, "required": ["n"]}}
    ],
    "messages": [
      {"role": "user", "content": [{"type": "text", "text": "Find top 5 purposes."}]}
    ]
  }'
```

## Typical JSON Response Shape (truncated)
```json
{
  "id": "msg_01A...",
  "type": "message",
  "role": "assistant",
  "model": "claude-3-5-sonnet-20240620",
  "content": [
    {"type": "text", "text": "Top donors include ..."}
  ],
  "stop_reason": "end_turn"
}
```

## Notes
- Replace `$ANTHROPIC_API_KEY` with your secret; never commit it.
- Headers: `x-api-key` and `anthropic-version` are required; set `content-type: application/json`.
- Models: pick from available (e.g., `claude-3-5-sonnet-20240620`, `claude-3-haiku-20240307`).
- For large prompts, prefer concise instructions and structured inputs.

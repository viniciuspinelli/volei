#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

# Ler o arquivo
with open('backend/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Encontrar e listar todas as linhas problemáticas
lines = content.split('\n')
print(f"Total de linhas: {len(lines)}\n")

# 1. Procurar duplicatas de funções
duplicatas = {}
for i, line in enumerate(lines, 1):
    if ' function ' in line or ' async function ' in line:
        # Extrair nome da função
        match = re.search(r'(async\s+)?function\s+(\w+)', line)
        if match:
            func_name = match.group(2)
            if func_name not in duplicatas:
                duplicatas[func_name] = []
            duplicatas[func_name].append(i)

print("Funções e suas linhas:")
for func, linhas_nums in duplicatas.items():
    if len(linhas_nums) > 1:
        print(f"  {func}: DUPLICADA em linhas {linhas_nums} ⚠️")
    else:
        print(f"  {func}: linha {linhas_nums[0]}")

# 2. Procurar chamadas de função com espaço errado
print("\nProcurando chamadas de função com erro:")
for i, line in enumerate(lines, 1):
    if re.search(r'marcarAvulsoComoP\s+ago|abrirLogin\s+\(|irPara\s+\(', line):
        print(f"  Linha {i}: {line.strip()[:80]} ⚠️")

# 3. Remover as duplicatas
print("\n\nCriando versão corrigida...")

# Encontrar índices das linhas a remover
lines_to_remove = set()

# Encontrar a primeira duplicata de marcarAvulsoComoPago (deve manter a segunda)
marcar_pago_lines = []
for i, line in enumerate(lines):
    if 'async function marcarAvulsoComoPago' in line:
        marcar_pago_lines.append(i)

if len(marcar_pago_lines) > 1:
    # Remover a primeira ocorrência (índice 0 é -1 na lista)
    first_occurrence = marcar_pago_lines[0]
    # Encontrar o fim da primeira função
    for i in range(first_occurrence + 1, len(lines)):
        if lines[i].strip().startswith('//') or (lines[i].strip() and lines[i][0] not in ' \t' and lines[i].strip().startswith('async function') or lines[i].strip().startswith('function')):
            # Encontrou fim da função
            for j in range(first_occurrence, i-1):
                lines_to_remove.add(j)
            break

# Encontrar a segunda duplicata de irPara (deve manter a primeira)
irpara_lines = []
for i, line in enumerate(lines):
    if 'function irPara(pagina)' in line:
        irpara_lines.append(i)

if len(irpara_lines) > 1:
    # Remover a segunda ocorrência
    second_occurrence = irpara_lines[1]
    # Encontrar o fim desta função
    for i in range(second_occurrence, len(lines)):
        if lines[i].strip() == '// INICIALIZA' or (i == len(lines) - 1):
            for j in range(second_occurrence - 2, i):  # Remover também comentário antes
                if j >= 0:
                    lines_to_remove.add(j)
            break

# Criar novo arquivo sem as linhas
new_lines = []
for i, line in enumerate(lines):
    if i not in lines_to_remove:
        new_lines.append(line)

# Salvar
with open('backend/public/index.html', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print(f"Removidas {len(lines_to_remove)} linhas duplicadas")
print(f"Nova quantidade de linhas: {len(new_lines)}")
print("✅ Arquivo corrigido!")

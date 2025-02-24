import threading
import time
import random

# Lista de "leads" fictícios
leads = [
    "5511999999999@c.us",
    "5511888888888@c.us",
    "5511777777777@c.us",
    "5511666666666@c.us",
    "5511555555555@c.us",
    "554797377750@c.us"
]

# Comandos disponíveis para envio
commands = [
    "!relatorio 2023-10-01",
    "!group GrupoA",
    "!conhecimento Dados importantes",
    "!ajuda",
    "!sentimento Estou muito feliz hoje!",
    "!traduzir Hello, how are you?",
    "!ner A reunião com João será em São Paulo no dia 15.",
    "!resumo Este é um texto longo que precisa ser resumido.",
    "!gerar Escreva um texto sobre inteligência artificial.",
    "!limpeza"
]

# Quantidade de threads simultâneas
NUM_THREADS = 50  # Ajuste esse número para mais ou menos carga
DURATION = 300  # Tempo total de teste (segundos)

# Função para simular o envio de mensagens em massa
def stress_test():
    end_time = time.time() + DURATION  # Tempo limite do teste

    while time.time() < end_time:
        lead = random.choice(leads)  # Escolhe um lead aleatório
        command = random.choice(commands)  # Escolhe um comando aleatório
        print(f"📨 Enviando para {lead}: {command}")
        time.sleep(random.uniform(0.1, 0.5))  # Pequeno delay aleatório entre mensagens

# Criando múltiplas threads para aumentar a carga
threads = []
for _ in range(NUM_THREADS):
    thread = threading.Thread(target=stress_test)
    thread.start()
    threads.append(thread)

# Espera todas as threads finalizarem
for thread in threads:
    thread.join()

print("🔥 Teste de estresse CONCLUÍDO com sucesso!")

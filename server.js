
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ==========================================
// CONFIGURAÇÕES
// ==========================================

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_KEY.');
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function validarId(id) {
  return /^\d+$/.test(id) &&
    Number.isSafeInteger(Number(id)) &&
    Number(id) > 0;
}

function erroServidor(res, error, operacao) {
  console.error(`Erro ao ${operacao}:`, error);

  return res.status(500).json({
    sucesso: false,
    mensagem: `Erro ao ${operacao} tarefa.`
  });
}

// ==========================================
// ROTA PRINCIPAL
// ==========================================

app.get('/', (req, res) => {
  res.status(200).json({
    sucesso: true,
    mensagem: 'API de tarefas funcionando!',
    banco: 'Supabase',
    versao: '1.0.0',
    endpoints: {
      listar: 'GET /tarefas',
      buscar: 'GET /tarefas/:id',
      criar: 'POST /tarefas',
      atualizar: 'PUT /tarefas/:id',
      concluir: 'PATCH /tarefas/:id/concluir',
      excluir: 'DELETE /tarefas/:id'
    }
  });
});

// ==========================================
// CREATE - CRIAR TAREFA
// ==========================================

app.post('/tarefas', async (req, res) => {
  try {
    const {
      titulo,
      descricao = '',
      concluida = false
    } = req.body;

    if (
      typeof titulo !== 'string' ||
      !titulo.trim()
    ) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'O título é obrigatório.'
      });
    }

    if (typeof descricao !== 'string') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'A descrição deve ser um texto.'
      });
    }

    if (typeof concluida !== 'boolean') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Concluida deve ser true ou false.'
      });
    }

    const { data, error } = await supabase
      .from('tarefas')
      .insert({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        concluida
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Tarefa criada com sucesso!',
      tarefa: data
    });

  } catch (error) {
    return erroServidor(res, error, 'criar');
  }
});

// ==========================================
// READ - LISTAR TODAS AS TAREFAS
// ==========================================

app.get('/tarefas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tarefas')
      .select('*')
      .order('created_at', {
        ascending: false
      });

    if (error) throw error;

    return res.status(200).json({
      sucesso: true,
      total: data.length,
      tarefas: data
    });

  } catch (error) {
    return erroServidor(res, error, 'buscar');
  }
});

// ==========================================
// READ - BUSCAR TAREFA POR ID
// ==========================================

app.get('/tarefas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!validarId(id)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'ID inválido.'
      });
    }

    const { data, error } = await supabase
      .from('tarefas')
      .select('*')
      .eq('id', Number(id))
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Tarefa não encontrada.'
      });
    }

    return res.status(200).json({
      sucesso: true,
      tarefa: data
    });

  } catch (error) {
    return erroServidor(res, error, 'buscar');
  }
});

// ==========================================
// UPDATE - ATUALIZAR TAREFA
// ==========================================

app.put('/tarefas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!validarId(id)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'ID inválido.'
      });
    }

    const { titulo, descricao, concluida } = req.body;
    const atualizacao = {};

    if (titulo !== undefined) {
      if (
        typeof titulo !== 'string' ||
        !titulo.trim()
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Título inválido.'
        });
      }

      atualizacao.titulo = titulo.trim();
    }

    if (descricao !== undefined) {
      if (typeof descricao !== 'string') {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Descrição inválida.'
        });
      }

      atualizacao.descricao = descricao.trim();
    }

    if (concluida !== undefined) {
      if (typeof concluida !== 'boolean') {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Concluida deve ser true ou false.'
        });
      }

      atualizacao.concluida = concluida;
    }

    if (Object.keys(atualizacao).length === 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Informe algum campo para atualizar.'
      });
    }

    const { data, error } = await supabase
      .from('tarefas')
      .update(atualizacao)
      .eq('id', Number(id))
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Tarefa não encontrada.'
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Tarefa atualizada com sucesso!',
      tarefa: data
    });

  } catch (error) {
    return erroServidor(res, error, 'atualizar');
  }
});

// ==========================================
// PATCH - MARCAR COMO CONCLUÍDA / PENDENTE
// ==========================================

app.patch('/tarefas/:id/concluir', async (req, res) => {
  try {
    const { id } = req.params;
    const { concluida } = req.body;

    if (!validarId(id)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'ID inválido.'
      });
    }

    if (typeof concluida !== 'boolean') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Informe concluida como true ou false.'
      });
    }

    const { data, error } = await supabase
      .from('tarefas')
      .update({ concluida })
      .eq('id', Number(id))
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Tarefa não encontrada.'
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: concluida
        ? 'Tarefa concluída!'
        : 'Tarefa marcada como pendente!',
      tarefa: data
    });

  } catch (error) {
    return erroServidor(res, error, 'atualizar');
  }
});

// ==========================================
// DELETE - EXCLUIR TAREFA
// ==========================================

app.delete('/tarefas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!validarId(id)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'ID inválido.'
      });
    }

    const { data, error } = await supabase
      .from('tarefas')
      .delete()
      .eq('id', Number(id))
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Tarefa não encontrada.'
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Tarefa excluída com sucesso!',
      tarefa: data
    });

  } catch (error) {
    return erroServidor(res, error, 'excluir');
  }
});

// ==========================================
// ROTA NÃO ENCONTRADA
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    mensagem: 'Rota não encontrada.'
  });
});

// ==========================================
// TRATAMENTO GLOBAL DE ERROS
// ==========================================

app.use((err, req, res, next) => {
  console.error('Erro interno:', err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    sucesso: false,
    mensagem: 'Erro interno no servidor.'
  });
});

// ==========================================
// EXPORTAÇÃO PARA VERCEL
// ==========================================

module.exports = app;

// Execução local
if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

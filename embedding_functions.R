library(fastcluster)
library(tidytext)
library(dplyr)
library(textmineR)
library(Rcpp)
library(text2vec)
library(magrittr)
library(stringr)
library(Rtsne)
library(visNetwork)
library(factoextra)
library(ggcorrplot)
library(igraph)
library(imputeTS)
library(microbenchmark)
library(tictoc)
library(uwot)
#library(snifter)
library(udpipe)
library(word2vec)
library(factoextra)
library(stopwords)
library(tm)

vectorize_data <- function(data) {
  prep_fun = tolower
  tok_fun = word_tokenizer
  text = paste0(data$title, data$venue, data$abstract)
  prep_fun = function(x) {
    # make text lower case
    x = str_to_lower(x)
    # remove non-alphanumeric symbols
    x = str_replace_all(x, "[^[:alpha:]]", " ")
    # collapse multiple spaces
    x = str_replace_all(x, "\\s+", " ")
  }
  it_train = itoken(
    text,
    preprocessor = prep_fun,
    tokenizer = tok_fun,
    ids = data$id,
    progressbar = FALSE
  )
  vocab = create_vocabulary(it_train, stopwords = stopwords::stopwords())
  vectorizer = vocab_vectorizer(vocab)
  dtm_train = create_dtm(it_train, vectorizer)
  return(dtm_train)
}

vectorize_word2vec <- function(data) {
  prep_fun = function(x) {
    # make text lower case
    x = str_to_lower(x)
    # remove non-alphanumeric symbols
    x = str_replace_all(x, "[^[:alpha:]]", " ")
    # collapse multiple spaces
    x = str_replace_all(x, "\\s+", " ")
  }
  text = data$title#paste0(data$title,data$venue,data$abstract)
  text = prep_fun(text)
  model =  word2vec(text, threads = 7, dim = 10)
  t(as.matrix(model))
}


create_network_embedding <-
  function(edges,
           nodes,
           embedding = "pca",
           use_lsa = T,
           lsa_dim = 10,
           tsne_perplexity = 30,
           tsne_n_iter = 50,
           tsne_njobs = 6
  ) {
    ids <- unique(nodes$id)
    #showNotification("vectorize data")
    
    dtm <- vectorize_data(nodes)
    model <- textmineR::FitLsaModel(dtm, lsa_dim)
    thet = model$theta
    
    dimensions <- nodes %>%
      select(year) %>%
      mutate(#n_citation = as.numeric(n_citation),
        year = as.numeric(year)) %>%
      #mutate(n_citation = na_random(n_citation))%>%
      mutate(year = na_random(year)) %>%
      cbind(thet) %>%
      scale()
    

    
    if (embedding == "TSNE") {
      #showNotification("TSNE Layout...")
      df_tsne <-
        fitsne(
          dimensions,
          perplexity = tsne_perplexity,
          n_components  = 2,
          n_jobs = tsne_njobs,
          n_iter = tsne_n_iter
        )
      emb = as.data.frame(df_tsne)
      colnames(emb) = c("x", "y")
    }
    
    
    if(embedding=="nicely"){
      #showNotification("nicely layout")
      emb = layout_nicely(g)
      colnames(emb)[1:2] <- c("x", "y")
    }
    if (embedding == "UMAP") {
      #showNotification("UMAP Layout...")
      emb = umap(dimensions)
      colnames(emb) = c("x", "y")
    }
    
    if (embedding == "PCA") {
      #showNotification("PCA Layout...")
      df_pca <- prcomp(t(dimensions))
      emb = as.data.frame(df_pca$rotation)
      emb = emb[, 1:2]
      colnames(emb)[1:2] <- c("x", "y")
    }
    
    if (embedding == "FR") {
      #showNotification("Fruchterman–Reingold Layout...")
      
      edges = edges%>%
        filter(to%in%nodes$id)%>%
        filter(from%in%nodes$id)
      g <- graph_from_data_frame(edges, vertices = nodes$id)
      
      emb = layout_with_fr(g)
      colnames(emb)[1:2] <- c("x", "y")
    }
    
    if (embedding == "KK") {
      #showNotification("Kamada–Kawai Layout...")
      edges = edges%>%
        filter(to%in%nodes$id)%>%
        filter(from%in%nodes$id)
      g <- graph_from_data_frame(edges, vertices = nodes$id)
      emb = layout_with_kk(g)
      colnames(emb)[1:2] <- c("x", "y")
    }
    
    if (embedding == "graphopt") {
      #showNotification("graphopt layout...")
      g <- graph_from_data_frame(edges, vertices = nodes$id)
      emb = layout_with_graphopt(g)
      colnames(emb)[1:2] <- c("x", "y")
    }
    
    if (embedding == "lgl") {
      #showNotification("lgl layout...")
      g <- graph_from_data_frame(edges, vertices = nodes$id)
      emb = layout_with_lgl(g)
      colnames(emb)[1:2] <- c("x", "y")
    }
    emb <- scale(emb)
    list(emb=emb,
         dimensions = dimensions)
    
    
  }
cluster_embedding <- function(emb, k,method="kmeans") {
  print("clustering... ")
  # function to find medoid in cluster i
  clust.centroid = function(i, dat, clusters) {
    ind = (clusters == i)
    colMeans(as.matrix(dat[ind,]))
  }
  if(method=="kmeans"){
    km <- kmeans(emb,centers = k)
    cluster = factor(km$cluster)
    
    
    list(
      cluster = cluster,
      centers = km$centers
    )
    
  }else{
    hc = hclust(dist(emb))
    cluster = cutree(hc, k = k)
    centers = sapply(unique(cluster), clust.centroid, emb, cluster)
    centers = t(centers)
    centers = as.data.frame(centers)
    colnames(centers) = c("x","y")
    
    list(
      cluster = factor(cluster),
      centers=centers
      )
  }

  
}



neighbor_links <- function(edges, nodes) {
  print("linkage")

  cons = list()
  n = 1
  for (c in unique(nodes$group)){
    connected = 0
    cluster_ids = nodes %>%
      filter(group==c)%>%
      select(id)%>%
      unique()%>%
      unlist()
    cluster_edges = edges %>%
      filter(from %in% cluster_ids| to %in% cluster_ids)
    if(nrow(cluster_edges)>0){
      for (i in 1:nrow(cluster_edges)) {
        edge <- cluster_edges[i, ]
        
        con_nodes <- nodes %>%
          filter(id == edge$from |id == edge$to) %>% 
          select(group) %>% 
          unlist() %>% 
          as.character()
        if (con_nodes[1] == con_nodes[2]) {
          connected = connected + 1
        }
      }
      con = connected / nrow(cluster_edges)
      cons[[n]] <- con
      n = n+1
    }else{
      cons[[n]] <- NA
      n = n+1
    }
    }
  
  cons

}



annotate_nodes <- function(data,use_raker=F){
  if(use_raker){
    ud_model <- udpipe_download_model(language = "english")
    ud_model <- udpipe_load_model(ud_model)
  }

  i = 1
  center_words = list()
  centroids_x = list()
  centroids_y = list()
  
  centroid_edges = data.frame()
 
  for (c in unique(data$group)){
    
    #showNotification(paste0("Cluster annotation: ",c))
    #Create a vector containing only the text
    cluster_nodes <-data%>%
      filter(group==c)
    cluster_edges <- data.frame(list(from =cluster_nodes$id,
                                     to=rep(c,nrow(cluster_nodes))))
    
    centroid_edges <- rbind(centroid_edges,cluster_edges)
    
    centroid_x = median(cluster_nodes$x,na.rm=T)
    centroid_y = median(cluster_nodes$y,na.rm=T)
    centroids_x[[i]] <- centroid_x
    centroids_y[[i]] <- centroid_y
    
    text <- cluster_nodes%>%
      mutate(text =paste(title))%>%
      select(text)%>%
      as.character()
    if(use_raker){
      annotate_splits <- function(x,model) {
        
        x <- udpipe_annotate(model, x = paste0(x$title," ",x$abstract), doc_id = x$id, tagger = "none", parser = "none")
        as.data.frame(x, detailed = TRUE)
      }
      text_corpus <- cluster_nodes %>%select(id,title) 
      
      corpus_splitted <- split(text_corpus, seq(1, nrow(text_corpus), by = 30))
      annotation <- mclapply(corpus_splitted, FUN = function(x, file){
        annotate_splits(x, file) 
      }, file = ud_model)
      annotation <- rbindlist(annotation)
      
      
      #x <- udpipe_annotate(ud_model, x = cluster_nodes$title)
      
      
      x <- as.data.frame(annotation)
      
      kw = keywords_rake(x = x, term = "lemma", group = c("doc_id"), 
                         relevant = x$xpos %in% c("NN", "JJ"), 
                         ngram_max = 3, n_min = 2, sep = "-")
      keyword = kw$keyword[1]
      center_words[[i]] = keyword
      
      i=i+1
    }else{
      
      # Create a corpus
      prep_fun = function(x) {
        # make text lower case
        x = str_to_lower(x)
        # remove non-alphanumeric symbols
        x = str_replace_all(x, "[^[:alpha:]]", " ")
        # collapse multiple spaces
        x = str_replace_all(x, "\\s+", " ")
        stopwords_regex = paste(stopwords::stopwords('en'), collapse = '\\b|\\b')
        stopwords_regex = paste0('\\b', stopwords_regex, '\\b')
        #x = str_replace_all(x, stopwords_regex, '')
        x
      }
      new_text <- prep_fun(text)
      docs <- tm::Corpus(VectorSource(new_text))
      dtm <- tm::TermDocumentMatrix(docs,
                                control =
                                  list(removeNumbers = TRUE,
                                       stopwords = TRUE))
      matrix <- as.matrix(dtm)
      words <- sort(rowSums(matrix),decreasing=TRUE)
      # keywords = str_split(input$keyword," ")
      # idx = which(!unlist(names(words))%in%unlist(keywords))
      # words = words[idx]

      keyword <- paste(names(words[1:3]),collapse=" ")
      center_words[[i]] = keyword
      
      i= i+1
    }
    
  }
  centroid_nodes = data.frame(list(id = unique(data$group),
                                   label = unlist(center_words),
                                   font.size= rep(70,length(center_words)),
                                   shape = rep("square",length(center_words)),
                                   group =factor(unique(data$group))
  ))
  
  
  centroid_pos = data.frame(unlist(centroids_x),unlist(centroids_y))
  colnames(centroid_pos) <- c("x","y")
  centroid_nodes <- cbind(centroid_nodes,centroid_pos)
  print(centroid_nodes)
  
  list(center_nodes = centroid_nodes,
       center_edges = centroid_edges
       )
}

# 
# text = "Many processes experience abrupt changes in their dynamics. This causes problems for some prediction algorithms which assume that the dynamics of the sequence to be predicted are constant, or at least only change slowly over time. In this paper the problem of predicting sequences with sudden changes in dynamics is considered. For a model of multivariate Gaussian data we derive expected generalization error of standard linear Fisher classifier in situation where after unexpected task change, the classification algorithm learns on a mixture of old and new data. We show both analytically and by an experiment that optimal length of learning sequence depends on complexity of the task, input dimensionality, on the power and periodicity of the changes. The proposed solution is to consider a collection of agents, in this case non-linear single layer perceptrons (agents), trained by a memetic like learning algorithm. The most successful agents are voting for predictions. A grouped structure of the agent population assists in obtaining favorable diversity in the agent population. Efficiency of socially organized evolving multi-agent system is demonstrated on an artificial problem."
# 
# library(LSAfun)
# print(text)
# 
# genericSummary(text,k=1)
